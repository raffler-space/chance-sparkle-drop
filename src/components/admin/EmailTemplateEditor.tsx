import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Mail, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface EmailTemplate {
  id: string;
  template_key: string;
  template_name: string;
  subject: string;
  html_content: string;
  description: string | null;
  variables: string[];
}

export const EmailTemplateEditor = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("template_name", { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({
        title: "Error",
        description: "Failed to load email templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (id: string, field: keyof EmailTemplate, value: string) => {
    setTemplates(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSave = async (templateId?: string) => {
    setSaving(true);
    try {
      const templatesToSave = templateId 
        ? templates.filter(t => t.id === templateId)
        : templates;

      for (const template of templatesToSave) {
        const { error } = await supabase
          .from("email_templates")
          .update({
            subject: template.subject,
            html_content: template.html_content,
          })
          .eq("id", template.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Email template${templateId ? '' : 's'} updated successfully`,
      });
    } catch (error) {
      console.error("Error saving templates:", error);
      toast({
        title: "Error",
        description: "Failed to save email templates",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderPreview = (template: EmailTemplate) => {
    // Replace variables with example values for preview
    let previewHtml = template.html_content;
    const exampleValues: Record<string, string> = {
      raffleName: 'Example Raffle',
      quantity: '5',
      totalPrice: '50.00',
      walletAddressShort: '0x1234...5678',
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      prizeDescription: 'Amazing Prize Package',
      winnerAddress: '0xabcd1234efgh5678ijkl90mnop1234qrst5678',
      drawTxHash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
      deliveryInfo: '123 Main St, City, State 12345',
      year: new Date().getFullYear().toString(),
    };

    template.variables?.forEach(variable => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      previewHtml = previewHtml.replace(regex, exampleValues[variable] || `[${variable}]`);
    });

    // Replace subject variables
    let previewSubject = template.subject;
    template.variables?.forEach(variable => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      previewSubject = previewSubject.replace(regex, exampleValues[variable] || `[${variable}]`);
    });

    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Subject:</h4>
          <p className="text-sm text-muted-foreground">{previewSubject}</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Email Preview:</h4>
          <div 
            className="border rounded-lg p-4 bg-white overflow-auto max-h-[500px]"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Email Templates</h2>
          <p className="text-muted-foreground">
            Customize automated email notifications sent to users
          </p>
        </div>
        <Button onClick={() => handleSave()} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving All...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save All Templates
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Mail className="w-5 h-5 text-primary" />
                    <CardTitle>{template.template_name}</CardTitle>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewTemplate(template)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Preview: {template.template_name}</DialogTitle>
                      </DialogHeader>
                      {renderPreview(template)}
                    </DialogContent>
                  </Dialog>
                  <Button
                    onClick={() => handleSave(template.id)}
                    disabled={saving}
                    size="sm"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Subject Line
                </label>
                <Input
                  value={template.subject}
                  onChange={(e) => handleTemplateChange(template.id, 'subject', e.target.value)}
                  placeholder="Email subject..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">HTML Content</label>
                  <div className="flex gap-1">
                    {template.variables?.map((variable) => (
                      <Badge key={variable} variant="secondary" className="text-xs">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Textarea
                  value={template.html_content}
                  onChange={(e) => handleTemplateChange(template.id, 'html_content', e.target.value)}
                  placeholder="HTML email template..."
                  className="font-mono text-xs min-h-[300px]"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Use variables like {'{{'} raffleName {'}'} in your template. Available variables are shown above.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
