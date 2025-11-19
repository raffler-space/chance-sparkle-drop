import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface EmailTemplate {
  template_key: string;
  subject: string;
  html_content: string;
  variables: string[];
}

export async function loadEmailTemplate(templateKey: string): Promise<EmailTemplate | null> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('email_templates')
      .select('template_key, subject, html_content, variables')
      .eq('template_key', templateKey)
      .single();

    if (error || !data) {
      console.error('Error loading email template:', error);
      return null;
    }

    return data as EmailTemplate;
  } catch (error) {
    console.error('Failed to load email template:', error);
    return null;
  }
}

export function renderTemplate(template: EmailTemplate, variables: Record<string, string>): { subject: string; html: string } {
  let renderedSubject = template.subject;
  let renderedHtml = template.html_content;

  // Replace all variables in both subject and HTML
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    renderedSubject = renderedSubject.replace(regex, value);
    renderedHtml = renderedHtml.replace(regex, value);
  });

  return {
    subject: renderedSubject,
    html: renderedHtml
  };
}
