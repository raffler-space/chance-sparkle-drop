import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const item of content) {
        const { error } = await supabase
          .from("site_content")
          .update({ content_value: item.content_value })
          .eq("id", item.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Site content updated successfully",
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

  const groupedContent = content.reduce((acc, item) => {
    if (!acc[item.page]) {
      acc[item.page] = [];
    }
    acc[item.page].push(item);
    return acc;
  }, {} as Record<string, SiteContent[]>);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Content Editor</h1>
            <p className="text-muted-foreground">Manage all text content across your website</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save All Changes
              </>
            )}
          </Button>
        </div>

        <Tabs defaultValue={Object.keys(groupedContent)[0]} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Object.keys(groupedContent).length}, 1fr)` }}>
            {Object.keys(groupedContent).map(page => (
              <TabsTrigger key={page} value={page} className="capitalize">
                <FileText className="w-4 h-4 mr-2" />
                {page}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(groupedContent).map(([page, items]) => (
            <TabsContent key={page} value={page} className="space-y-4 mt-4">
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
        </Tabs>
      </div>
    </div>
  );
};

export default ContentEditor;
