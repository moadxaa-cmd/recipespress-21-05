import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, ExternalLink, ChevronRight, Zap, Globe, Code2, Layers, Shield, Terminal } from 'lucide-react';

type Tab = 'curl' | 'javascript' | 'python';

interface Param {
  name: string;
  required?: boolean;
  type: string;
  description: string;
  default?: string;
  allowed?: string[];
  note?: string;
}

export const ApiDocsPage: React.FC<{ appName: string }> = ({ appName }) => {
  const [activeTab, setActiveTab] = useState<Tab>('curl');
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const contentRef = useRef<HTMLDivElement>(null);

  const endpointUrl = `${window.location.origin}/api.php`;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id); });
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    document.querySelectorAll('section[id]').forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const snippets: Record<Tab, string> = {
    curl:
`curl -X POST ${endpointUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "type_of_article": "article&recipe",
    "keyword": "Healthy Avocado Toast",
    "recipe_text": "2 slices sourdough...",
    "category": "Breakfast",
    "feature_image_base64": "base64string...",
    "image_base64": "base64string...",
    "external_links": [
      { "name": "Product", "link": "https://product.url" }
    ],
    "schema_markup": "faq&recipecard",
    "post_status": "publish",
    "site_url": "https://yourblog.com",
    "site_token": "YOUR_TOKEN",
    "language": "English"
  }'`,
    javascript:
`const response = await fetch("${endpointUrl}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type_of_article: "article&recipe",
    keyword: "Healthy Avocado Toast",
    recipe_text: "2 slices sourdough...",
    category: "Breakfast",
    feature_image_base64: "base64string...",
    image_base64: "base64string...",
    external_links: [
      { name: "Product", link: "https://product.url" }
    ],
    schema_markup: "faq&recipecard",
    post_status: "publish",
    site_url: "https://yourblog.com",
    site_token: "YOUR_TOKEN",
    language: "English",
  }),
});

const data = await response.json();
console.log(data);`,
    python:
`import requests

response = requests.post(
    "${endpointUrl}",
    json={
        "type_of_article": "article&recipe",
        "keyword": "Healthy Avocado Toast",
        "recipe_text": "2 slices sourdough...",
        "category": "Breakfast",
        "feature_image_base64": "base64string...",
        "image_base64": "base64string...",
        "external_links": [
            {"name": "Product", "link": "https://product.url"}
        ],
        "schema_markup": "faq&recipecard",
        "post_status": "publish",
        "site_url": "https://yourblog.com",
        "site_token": "YOUR_TOKEN",
        "language": "English",
    }
)

print(response.json())`,
  };

  const parameters: Param[] = [
    {
      name: 'type_of_article',
      type: 'string',
      description: 'Controls the structure of the generated content.',
      default: 'article&recipe',
      allowed: ['seo_article', 'article&recipe', 'intro&recipe'],
    },
    {
      name: 'keyword',
      type: 'string',
      description: 'Target keyword for generation. Used only when recipe_text is empty.',
    },
    {
      name: 'recipe_text',
      type: 'string',
      description: 'Raw ingredients and instructions to format into a structured recipe.',
    },
    {
      name: 'category',
      type: 'string',
      description: 'WordPress category to assign to the published post.',
    },
    {
      name: 'feature_image_base64',
      type: 'string',
      description: "Base64-encoded image used as the post's featured image.",
    },
    {
      name: 'image_base64',
      type: 'string',
      description: 'Base64-encoded secondary or instructional image embedded in the post body.',
    },
    {
      name: 'external_links',
      type: 'array',
      description: 'Array of affiliate or reference links to weave into the content.',
      note: '[{ "name": "Product Name", "link": "https://product.url" }]',
    },
    {
      name: 'schema_markup',
      type: 'string',
      description: 'Structured data markup injected into the post for SEO.',
      default: 'faq&recipecard',
      allowed: ['faq&recipecard', 'faq', 'none'],
    },
    {
      name: 'post_status',
      type: 'string',
      description: 'Whether to publish immediately or save as a draft.',
      default: 'publish',
      allowed: ['publish', 'draft'],
    },
    {
      name: 'site_url',
      required: true,
      type: 'string',
      description: 'Base URL of your WordPress site.',
      note: 'e.g. https://myblog.com',
    },
    {
      name: 'site_token',
      required: true,
      type: 'string',
      description: 'Authentication token from your RecipePress Connector plugin.',
    },
    {
      name: 'gemini_api_key',
      required: true,
      type: 'string',
      description: 'Per-request Gemini API key override. Uses server env variable by default.',
      note: 'Not recommended for production use.',
    },
    {
      name: 'language',
      type: 'string',
      description: 'Output language for all generated content.',
      default: 'English',
      allowed: ['English', 'French', 'Spanish', 'German'],
    },
  ];

  const navSections = [
    { id: 'overview', label: 'Overview', icon: Globe },
    { id: 'authentication', label: 'Authentication', icon: Shield },
    { id: 'endpoint', label: 'POST /api.php', icon: Terminal, badge: 'POST' },
    { id: 'n8n', label: 'n8n integration', icon: Layers },
  ];

  const copy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const S = {
    page: {
      background: '#ffffff',
      minHeight: '100vh',
      fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
      color: '#1e293b',
    } as React.CSSProperties,
    topBar: {
      height: 3,
      background: 'linear-gradient(90deg, #0d9488, #2dd4bf)',
    } as React.CSSProperties,
    hero: {
      borderBottom: '1px solid #e2e8f0',
      padding: '64px 48px 56px',
      position: 'relative',
      overflow: 'hidden',
      background: '#f8fafc',
    } as React.CSSProperties,
    heroGlow: {
      position: 'absolute',
      top: -120,
      right: -60,
      width: 500,
      height: 500,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(13,148,136,0.06) 0%, transparent 70%)',
      pointerEvents: 'none',
    } as React.CSSProperties,
    heroInner: { maxWidth: 1200, margin: '0 auto' } as React.CSSProperties,
    body: {
      maxWidth: 1200,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      padding: '0 48px 80px',
    } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      <style dangerouslySetInnerHTML={{ __html: `
        .responsive-hero { padding: 40px 24px !important; }
        .responsive-hero-h1 { font-size: 32px !important; }
        .responsive-body { grid-template-columns: 1fr !important; padding: 0 24px 60px !important; }
        .responsive-sidebar { display: none !important; }
        .responsive-content { padding-left: 0 !important; border-left: none !important; padding-top: 24px !important; overflow: hidden !important; width: 100% !important; box-sizing: border-box !important; }
        .responsive-grid-3, .responsive-grid-2, .responsive-grid-4 { grid-template-columns: 1fr !important; gap: 16px !important; }
        .responsive-endpoint-url { word-break: break-all; font-size: 13px !important; }
        .responsive-n8n-row { flex-direction: column; align-items: flex-start !important; gap: 4px !important; padding: 12px 16px !important; }
        .responsive-n8n-row > span:first-child { width: auto !important; margin-bottom: 4px; font-size: 12px !important; }
        .responsive-endpoint-wrap { flex-direction: column; align-items: flex-start !important; gap: 8px !important; width: 100% !important; }

        @media (min-width: 768px) {
          .responsive-hero { padding: 64px 48px 56px !important; }
          .responsive-hero-h1 { font-size: 42px !important; }
          .responsive-body { grid-template-columns: 220px 1fr !important; padding: 0 48px 80px !important; }
          .responsive-sidebar { display: block !important; }
          .responsive-content { padding-left: 48px !important; border-left: 1px solid #e2e8f0 !important; padding-top: 40px !important; overflow: visible !important; width: auto !important; }
          .responsive-grid-4 { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .responsive-endpoint-url { word-break: normal; font-size: 14px !important; }
          .responsive-n8n-row { flex-direction: row; align-items: center !important; gap: 16px !important; padding: 11px 24px !important; }
          .responsive-n8n-row > span:first-child { width: 160px !important; margin-bottom: 0px; font-size: 13px !important; }
          .responsive-endpoint-wrap { flex-direction: row; align-items: center !important; gap: 12px !important; width: fit-content !important; }
        }

        @media (min-width: 1024px) {
          .responsive-grid-3 { grid-template-columns: repeat(3, 1fr) !important; gap: 16px !important; }
          .responsive-grid-2 { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          .responsive-grid-4 { grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}} />
      <div style={S.topBar} />

      {/* Hero */}
      <div style={S.hero} className="responsive-hero">
        <div style={S.heroGlow} />
        <div style={S.heroInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ padding: '4px 10px', background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#0d9488', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>REST API</div>
            <div style={{ padding: '4px 10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#16a34a' }}>● Live</div>
          </div>
          <h1 className="responsive-hero-h1" style={{ fontSize: 42, fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.02em', color: '#0f172a' }}>
            {appName} <span style={{ color: '#0d9488' }}>API</span> Reference
          </h1>
          <p style={{ fontSize: 17, color: '#475569', maxWidth: 600, lineHeight: 1.7, margin: '0 0 32px' }}>
            One endpoint. Full control. Generate AI-powered recipe content and publish it directly to WordPress — from any language, tool, or automation platform.
          </p>
          <div className="responsive-endpoint-wrap" style={{ display: 'flex', padding: '12px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, boxSizing: 'border-box', fontFamily: 'monospace' }}>
            <span style={{ padding: '2px 8px', background: '#0d9488', color: '#ffffff', borderRadius: 4, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>POST</span>
            <span className="responsive-endpoint-url" style={{ color: '#475569' }}>{endpointUrl}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={S.body} className="responsive-body">

        {/* Sidebar */}
        <div className="responsive-sidebar" style={{ paddingTop: 40 }}>
          <nav style={{ position: 'sticky', top: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#64748b', marginBottom: 12, paddingLeft: 12 }}>Navigation</div>
            {navSections.map(({ id, label, icon: Icon, badge }) => {
              const active = activeSection === id;
              return (
                <a key={id} href={`#${id}`} onClick={(e) => scrollTo(e, id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, marginBottom: 2,
                  textDecoration: 'none', fontSize: 13, fontWeight: active ? 500 : 400,
                  color: active ? '#0d9488' : '#64748b',
                  background: active ? 'rgba(13,148,136,0.1)' : 'transparent',
                  transition: 'all 0.15s', borderLeft: active ? '2px solid #0d9488' : '2px solid transparent',
                }}>
                  <Icon size={14} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge && <span style={{ padding: '1px 5px', background: 'rgba(13,148,136,0.1)', color: '#0d9488', borderRadius: 3, fontSize: 10, fontWeight: 700 }}>{badge}</span>}
                </a>
              );
            })}

            <div style={{ margin: '24px 12px 16px', borderTop: '1px solid #e2e8f0' }} />
            <div style={{ padding: '0 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#64748b', marginBottom: 12 }}>Quick stats</div>
              {[['Method', 'POST'], ['Auth', 'Body token'], ['Format', 'JSON'], ['Returns', 'JSON']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}>{k}</span>
                  <span style={{ color: '#1e293b', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </nav>
        </div>

        {/* Main content */}
        <div ref={contentRef} className="responsive-content" style={{ paddingTop: 40, paddingLeft: 48, borderLeft: '1px solid #e2e8f0' }}>

          {/* Overview */}
          <section id="overview" style={{ scrollMarginTop: 32, marginBottom: 72 }}>
            <SectionLabel>Overview</SectionLabel>
            <h2 style={{ fontSize: 26, fontWeight: 600, color: '#0f172a', margin: '0 0 16px', letterSpacing: '-0.01em' }}>How it works</h2>
            <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8, marginBottom: 32 }}>
              The {appName} API is a single PHP endpoint that orchestrates content generation and publishing in one request. Send a POST with your recipe data, and the server calls the Gemini API to generate SEO-optimized content, then pushes it directly to your WordPress site via the RecipePress Connector plugin.
            </p>
            <div className="responsive-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { icon: Zap, title: 'One request', desc: 'Generate and publish in a single API call' },
                { icon: Code2, title: 'Any language', desc: 'Works with curl, JS, Python, n8n, and more' },
                { icon: Globe, title: 'WordPress native', desc: 'Publishes directly via RecipePress plugin' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} style={{ padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                  <div style={{ width: 32, height: 32, background: 'rgba(13,148,136,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Icon size={16} style={{ color: '#0d9488' }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{desc}</div>
                </div>
              ))}
            </div>
          </section>


          {/* Authentication */}
          <section id="authentication" style={{ scrollMarginTop: 32, marginBottom: 72 }}>
            <SectionLabel>Authentication</SectionLabel>
            <h2 style={{ fontSize: 26, fontWeight: 600, color: '#0f172a', margin: '0 0 16px', letterSpacing: '-0.01em' }}>Token-based auth</h2>
            <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8, marginBottom: 24 }}>
              No Authorization headers needed. Your <IC>site_token</IC> travels in the JSON body alongside your content. The token is generated by the RecipePress Connector plugin installed on your WordPress site.
            </p>
            <div style={{ padding: '16px 20px', background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠</span>
              <div style={{ fontSize: 13, color: '#854d0e', lineHeight: 1.7 }}>
                The server requires a <IC dark>GEMINI_API_KEY</IC> environment variable set on your PHP server. Never expose this key in client-side code.
              </div>
            </div>
          </section>

          {/* Endpoint */}
          <section id="endpoint" style={{ scrollMarginTop: 32, marginBottom: 72 }}>
            <SectionLabel>Endpoint</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ padding: '4px 10px', background: 'rgba(13,148,136,0.1)', color: '#0d9488', borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>POST</span>
              <h2 style={{ fontSize: 26, fontWeight: 600, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>Generate post</h2>
            </div>
            <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8, marginBottom: 40 }}>
              Creates a fully optimized recipe blog post and publishes it to WordPress. Returns the site's response including the post URL on success.
            </p>

            <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>

              {/* Parameters */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#64748b', marginBottom: 16 }}>Body parameters</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {parameters.map((p) => <ParamRow key={p.name} param={p} />)}
                </div>
              </div>

              {/* Code panel */}
              <div style={{ position: 'sticky', top: 32 }}>
                <div style={{ background: '#0f0f1a', border: '1px solid #2d2d4a', borderRadius: 12, overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#161625', borderBottom: '1px solid #2d2d4a' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(['curl', 'javascript', 'python'] as Tab[]).map((t) => (
                        <button key={t} onClick={() => setActiveTab(t)} style={{
                          padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                          background: activeTab === t ? '#2d2d4a' : 'transparent',
                          color: activeTab === t ? '#2dd4bf' : '#94a3b8',
                          transition: 'all 0.15s',
                        }}>
                          {t === 'curl' ? 'cURL' : t === 'javascript' ? 'JavaScript' : 'Python'}
                        </button>
                      ))}
                    </div>
                    <button onClick={copy} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: copied ? '#4ade80' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, transition: 'color 0.15s' }}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ padding: '20px', overflowX: 'auto', maxHeight: 480, overflowY: 'auto' }}>
                    <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.75, fontFamily: "'JetBrains Mono', monospace", color: '#e2e8f0', whiteSpace: 'pre' }}>{snippets[activeTab]}</pre>
                  </div>
                </div>

                {/* Response preview */}
                <div style={{ marginTop: 16, background: '#0f0f1a', border: '1px solid #2d2d4a', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', background: '#161625', borderBottom: '1px solid #2d2d4a', fontSize: 12, color: '#e2e8f0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 }} />
                    200 OK Response
                  </div>
                  <pre style={{ margin: 0, padding: '16px 20px', fontSize: 12, lineHeight: 1.75, fontFamily: "'JetBrains Mono', monospace", color: '#94a3b8' }}>{`{
  "success": true,
  "post_id": 4821,
  "post_url": "https://yourblog.com/avocado-toast/",
  "message": "Post published successfully."
}`}</pre>
                </div>
              </div>
            </div>
          </section>

          {/* n8n */}
          <section id="n8n" style={{ scrollMarginTop: 32 }}>
            <SectionLabel>Integration</SectionLabel>
            <h2 style={{ fontSize: 26, fontWeight: 600, color: '#0f172a', margin: '0 0 16px', letterSpacing: '-0.01em' }}>n8n automation</h2>
            <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8, marginBottom: 32 }}>
              Connect Google Sheets, Airtable, or RSS feeds to this endpoint in minutes using n8n's HTTP Request node — no code required.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', marginBottom: 24, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ padding: '14px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, background: '#f1f5f9' }}>
                <Layers size={16} style={{ color: '#0d9488' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>HTTP Request node configuration</span>
              </div>
              <div style={{ background: '#ffffff' }}>
                {[
                  { key: 'Node', value: 'HTTP Request', valueColor: '#0f172a' },
                  { key: 'Method', value: 'POST', valueColor: '#0d9488', valueBg: 'rgba(13,148,136,0.1)' },
                  { key: 'URL', value: endpointUrl, valueColor: '#0369a1', mono: true },
                  { key: 'Body Content Type', value: 'JSON', valueColor: '#15803d' },
                  { key: 'Send Body', value: 'Specify Body → map your fields', valueColor: '#475569' },
                ].map(({ key, value, valueColor, valueBg, mono }, i, arr) => (
                  <div key={key} className="responsive-n8n-row" style={{ display: 'flex', borderBottom: i < arr.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                    <span style={{ color: '#64748b' }}>{key}</span>
                    <span style={{ fontSize: 13, color: valueColor, fontFamily: mono ? 'monospace' : 'inherit', background: valueBg || 'transparent', padding: valueBg ? '2px 8px' : 0, borderRadius: valueBg ? 4 : 0, fontWeight: 500, wordBreak: mono ? 'break-all' : 'normal' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                'Place api.php on a public PHP server',
                'Set GEMINI_API_KEY as a server env variable',
                'Add HTTP Request node in n8n',
                'Map your data source fields to the JSON body',
              ].map((step, i) => (
                <div key={i} style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0d9488', marginBottom: 8, letterSpacing: '0.05em' }}>Step {i + 1}</div>
                  <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{step}</div>
                </div>
              ))}
            </div>

            <a href="https://n8n.io" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: 8, color: '#0d9488', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              n8n documentation <ExternalLink size={13} />
            </a>
          </section>


        </div>
      </div>
    </div>
  );
};

/* ── Helpers ── */

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
    <ChevronRight size={13} style={{ color: '#0d9488' }} />
    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#0d9488' }}>{children}</span>
  </div>
);

const IC: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <code style={{
    fontSize: '0.85em', fontFamily: 'monospace', padding: '2px 6px', borderRadius: 4,
    background: dark ? 'rgba(234,179,8,0.1)' : 'rgba(13,148,136,0.1)',
    color: dark ? '#854d0e' : '#0d9488',
    border: `1px solid ${dark ? 'rgba(234,179,8,0.2)' : 'rgba(13,148,136,0.2)'}`,
  }}>{children}</code>
);

const ParamRow: React.FC<{ param: Param }> = ({ param }) => {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  return (
    <div 
      onClick={() => setOpen((o) => !o)} 
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
        background: open ? '#f8fafc' : '#ffffff',
        border: `1px solid ${open ? '#0d9488' : hover ? '#cbd5e1' : '#e2e8f0'}`,
        boxShadow: hover && !open ? '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.02)' : '0 1px 2px 0 rgba(0,0,0,0.05)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: hover && !open ? 'translateY(-1px)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <code style={{ fontSize: 13, fontFamily: 'monospace', color: '#0f172a', fontWeight: 500 }}>{param.name}</code>
        {param.required && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.2)', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>required</span>
        )}
        <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginLeft: 'auto' }}>{param.type}</span>
        <ChevronRight size={12} style={{ color: '#94a3b8', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
      </div>
      {open && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, margin: '0 0 8px' }}>{param.description}</p>
          {param.default && (
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              Default: <code style={{ fontSize: 12, fontFamily: 'monospace', padding: '1px 6px', borderRadius: 4, background: '#e2e8f0', color: '#475569' }}>{param.default}</code>
            </div>
          )}
          {param.allowed && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {param.allowed.map((v) => (
                <code key={v} style={{ fontSize: 11, fontFamily: 'monospace', padding: '2px 8px', borderRadius: 4, background: '#e2e8f0', color: '#475569', border: '1px solid #cbd5e1' }}>{v}</code>
              ))}
            </div>
          )}
          {param.note && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>{param.note}</div>
          )}
        </div>
      )}
    </div>
  );
};