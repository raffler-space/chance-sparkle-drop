import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, FileText, ArrowLeft, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailTemplateEditor } from "@/components/admin/EmailTemplateEditor";

interface SiteContent {
  id: string;
  content_key: string;
  content_value: string;
  description: string;
  page: string;
}

const ContentEditor = () => {
  const [content, setContent] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndLoadContent();
  }, []);

  const checkAdminAndLoadContent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this page.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadContent();
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/");
    }
  };

  const loadContent = async () => {
    try {
      const { data, error } = await supabase
        .from("site_content")
        .select("*")
        .order("page", { ascending: true })
        .order("content_key", { ascending: true });

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error("Error loading content:", error);
      toast({
        title: "Error",
        description: "Failed to load site content",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (id: string, value: string) => {
    setContent(prev =>
      prev.map(item =>
        item.id === id ? { ...item, content_value: value } : item
      )
    );
  };

  const handleSave = async (page?: string) => {
    setSaving(true);
    try {
      const itemsToSave = page 
        ? content.filter(item => item.page === page)
        : content;

      for (const item of itemsToSave) {
        const { error } = await supabase
          .from("site_content")
          .update({ content_value: item.content_value })
          .eq("id", item.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `${page ? page.charAt(0).toUpperCase() + page.slice(1) : "All"} content updated successfully`,
      });
    } catch (error) {
      console.error("Error saving content:", error);
      toast({
        title: "Error",
        description: "Failed to save content",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // Define field ordering for better UX
  const fieldOrder: Record<string, string[]> = {
    home: [
      'hero_title',
      'hero_subtitle',
      'hero_feature_1_title',
      'hero_feature_1_description',
      'hero_feature_2_title',
      'hero_feature_2_description',
      'hero_feature_3_title',
      'hero_feature_3_description',
      'active_section_title',
      'active_section_subtitle',
      'upcoming_section_title',
      'upcoming_section_subtitle',
      'features_section_title',
      'feature_1_icon',
      'feature_1_title',
      'feature_1_description',
      'feature_2_icon',
      'feature_2_title',
      'feature_2_description',
      'feature_3_icon',
      'feature_3_title',
      'feature_3_description',
      'feature_4_icon',
      'feature_4_title',
      'feature_4_description',
      'feature_5_icon',
      'feature_5_title',
      'feature_5_description',
      'feature_6_icon',
      'feature_6_title',
      'feature_6_description'
    ],
    legal: [
      'terms_of_service',
      'privacy_policy',
      'disclaimer'
    ]
  };

  const groupedContent = content.reduce((acc, item) => {
    if (!acc[item.page]) {
      acc[item.page] = [];
    }
    acc[item.page].push(item);
    return acc;
  }, {} as Record<string, SiteContent[]>);

  // Sort each page's content by the defined field order
  Object.keys(groupedContent).forEach(page => {
    const order = fieldOrder[page] || [];
    groupedContent[page].sort((a, b) => {
      const indexA = order.indexOf(a.content_key);
      const indexB = order.indexOf(b.content_key);
      
      // If both fields are in the order array, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // If only one is in the order array, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      // Otherwise, sort alphabetically
      return a.content_key.localeCompare(b.content_key);
    });
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Content Editor</h1>
              <p className="text-muted-foreground">Manage all text content across your website</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue={Object.keys(groupedContent)[0]} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Object.keys(groupedContent).length + 1}, 1fr)` }}>
            {Object.keys(groupedContent).map(page => (
              <TabsTrigger key={page} value={page} className="capitalize">
                <FileText className="w-4 h-4 mr-2" />
                {page}
              </TabsTrigger>
            ))}
            <TabsTrigger value="emails">
              <Mail className="w-4 h-4 mr-2" />
              Email Templates
            </TabsTrigger>
          </TabsList>

          {Object.entries(groupedContent).map(([page, items]) => (
            <TabsContent key={page} value={page} className="space-y-4 mt-4">
              <div className="flex justify-end mb-4">
                <Button onClick={() => handleSave(page)} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save {page.charAt(0).toUpperCase() + page.slice(1)} Changes
                    </>
                  )}
                </Button>
              </div>
              {items.map(item => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{item.content_key.replace(/_/g, " ").toUpperCase()}</CardTitle>
                    {item.description && (
                      <CardDescription>{item.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {item.content_value.length > 100 ? (
                      <Textarea
                        value={item.content_value}
                        onChange={(e) => handleContentChange(item.id, e.target.value)}
                        className="min-h-[100px]"
                      />
                    ) : (
                      <Input
                        value={item.content_value}
                        onChange={(e) => handleContentChange(item.id, e.target.value)}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
          
          <TabsContent value="emails" className="mt-4">
            <EmailTemplateEditor />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ContentEditor;
