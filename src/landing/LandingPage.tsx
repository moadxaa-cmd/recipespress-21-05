
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Icons } from '../constants';

interface LandingPageProps {
  appName: string;
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200/80 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-teal-100 text-teal-600 mb-5">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-slate-900">{title}</h3>
    <p className="mt-2 text-slate-600">{children}</p>
  </div>
);

const StepCard: React.FC<{ number: string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="flex">
        <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-teal-600 text-white font-bold text-2xl">
                {number}
            </div>
        </div>
        <div className="ml-4">
            <h4 className="text-lg leading-6 font-bold text-slate-900">{title}</h4>
            <p className="mt-2 text-base text-slate-600">{children}</p>
        </div>
    </div>
);

const FAQItem: React.FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
        <div className="border-b border-slate-200 py-6">
            <dt>
                <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-start text-left text-slate-400">
                    <span className="font-medium text-slate-900">{question}</span>
                    <span className="ml-6 h-7 flex items-center">
                        <svg className={`h-6 w-6 transform ${isOpen ? '-rotate-180' : 'rotate-0'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </span>
                </button>
            </dt>
            {isOpen && (
                <dd className="mt-2 pr-12">
                    <p className="text-base text-slate-600">{children}</p>
                </dd>
            )}
        </div>
    );
};

export const LandingPage: React.FC<LandingPageProps> = ({ appName }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white selection:bg-teal-100 selection:text-teal-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-32 sm:pt-24 sm:pb-40 lg:pt-32 lg:pb-48 bg-slate-50 border-b border-slate-200/50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-teal-500 opacity-20 blur-[100px]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-sm font-medium text-teal-700 mb-8 max-w-max mx-auto shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-teal-500"></span>
                v1.0 Now in Beta
            </div>
            
            <h1 className="text-5xl tracking-tight font-extrabold text-slate-900 sm:text-6xl md:text-7xl max-w-4xl mx-auto leading-[1.1]">
                <span className="block mb-2">Create Once. Publish Everywhere.</span>
                <span className="inline-block bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 bg-clip-text text-transparent">with the Power of AI</span>
            </h1>
            <p className="mt-6 max-w-xl mx-auto text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
                Turn a single recipe into a fully formatted, SEO-optimized WordPress post and a month's worth of Pinterest pins—automatically. Grow your audience on autopilot while you focus on the food.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                    onClick={() => navigate('/signup')}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-medium rounded-xl text-white bg-teal-600 hover:bg-teal-700 shadow-[0_4px_14px_0_rgba(13,148,136,0.39)] hover:shadow-[0_6px_20px_rgba(13,148,136,0.23)] hover:-translate-y-0.5 transition-all duration-200"
                >
                    Get Started for Free
                </button>
                <button
                    onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 border-2 border-slate-200 text-base font-medium rounded-xl text-slate-700 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
                >
                    See How It Works
                </button>
            </div>
            <p className="mt-5 text-sm text-slate-500 font-medium">No credit card required. Free during beta.</p>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-24 sm:py-32 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-teal-600 font-bold tracking-widest uppercase">Why Choose {appName}</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              The Ultimate Growth Engine for Food Bloggers
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={React.cloneElement(Icons.sparkles, {className:"w-8 h-8"})} title="Hours of Writing, Done in Seconds">
              Generate complete, well-structured recipe articles from a simple keyword or rough notes using our fine-tuned AI.
            </FeatureCard>
            <FeatureCard icon={React.cloneElement(Icons.trendingUp, {className:"w-8 h-8"})} title="Rank Higher, Automatically">
              Built-in SEO titles, meta descriptions, and schema markup (Recipe & FAQ) designed to dominate search engine results.
            </FeatureCard>
            <FeatureCard icon={React.cloneElement(Icons.globe, {className:"w-8 h-8"})} title="One-Click WordPress Publishing">
              Connect your sites and publish directly to your blog. Never deal with copy-pasting formatting errors again.
            </FeatureCard>
            <FeatureCard icon={React.cloneElement(Icons.photo, {className:"w-8 h-8"})} title="Stunning Food Photography">
              Generate mouth-watering, royalty-free featured images automatically, or use AI to enhance your own photos.
            </FeatureCard>
            <FeatureCard icon={React.cloneElement(Icons.server, {className:"w-8 h-8"})} title="Manage Your Whole Empire">
              Control multiple food blogs from one dashboard. Scale your content operations without adding hours to your day.
            </FeatureCard>
            <FeatureCard icon={React.cloneElement(Icons.rocket, {className:"w-8 h-8"})} title="Pinterest on Autopilot">
              Automatically generate high-converting pin designs and schedule them to Pinterest to drive massive, continuous traffic.
            </FeatureCard>
          </div>
        </div>
      </div>
      
      {/* How It Works Section */}
      <div id="how-it-works" className="py-24 sm:py-32 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
                <h2 className="text-base text-teal-600 font-bold tracking-widest uppercase">How It Works</h2>
                <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    Publish Everywhere in 4 Steps
                </p>
            </div>
            <div className="mt-12">
                <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10 lg:grid-cols-4">
                    <StepCard number="1" title="Connect Platforms">
                        Securely link your WordPress site and Pinterest account in seconds.
                    </StepCard>
                    <StepCard number="2" title="Provide Your Idea">
                        Start with a simple keyword, title, or paste in your messy recipe notes.
                    </StepCard>
                    <StepCard number="3" title="AI Heavy Lifting">
                        We outline the article, write the post, create SEO schema, and generate pin designs.
                    </StepCard>
                    <StepCard number="4" title="Publish Everywhere">
                        Click once to publish to your blog and automatically schedule pins to Pinterest.
                    </StepCard>
                </dl>
            </div>
        </div>
      </div>
      
      {/* FAQ Section */}
       <div className="bg-white">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl font-extrabold text-slate-900">Frequently Asked Questions</h2>
            </div>
            <dl className="mt-12 max-w-3xl mx-auto">
                <FAQItem question="Is this really free?">
                    Yes! During our beta period, {appName} is completely free to use. We want to gather feedback and make this the best tool possible for food bloggers. We may introduce paid plans with additional premium features in the future.
                </FAQItem>
                 <FAQItem question="How does the AI work?">
                    We use Google's powerful Gemini API. Our specialized "agents" (for SEO, content, and linking) work together to create a comprehensive and high-quality blog post based on your initial input and settings.
                </FAQItem>
                 <FAQItem question="Is the content unique and SEO-friendly?">
                    Absolutely. The content is generated uniquely for you each time. Our SEO agent is specifically designed to include all the necessary elements for ranking well, including keywords, meta tags, and structured data (schema).
                </FAQItem>
                 <FAQItem question="Can I use this on my existing blog posts?">
                    Yes! One of the key features is the ability to update existing posts. You can easily add a recipe card to a post that's missing one, or even regenerate the entire article text while keeping your existing images.
                </FAQItem>
            </dl>
        </div>
    </div>
      
      {/* Final CTA Section */}
      <div className="bg-white">
        <div className="max-w-5xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative">
            <div className="absolute inset-0 bg-teal-600 rounded-3xl transform -skew-y-2 opacity-10"></div>
            <div className="relative bg-teal-700 rounded-3xl shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <div className="px-6 py-16 sm:p-20 text-center relative z-10">
                    <h2 className="text-3xl font-extrabold text-white sm:text-4xl tracking-tight">
                        <span className="block mb-2">Ready to supercharge your blog?</span>
                    </h2>
                    <p className="mt-4 text-lg leading-6 text-teal-100 max-w-2xl mx-auto font-medium">
                        Start creating amazing recipe content and Pinterest pins in a fraction of the time. Join our beta today.
                    </p>
                    <button
                        onClick={() => navigate('/signup')}
                        className="mt-8 w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-lg font-bold rounded-xl text-teal-700 bg-white hover:bg-teal-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                    >
                        Create Your Free Account
                    </button>
                    <p className="mt-5 text-sm text-center text-teal-200">No credit card required to start.</p>
                </div>
            </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
            <div className="flex justify-center space-x-6 md:order-2">
                <Link to="/about" className="text-slate-500 hover:text-teal-600 transition-colors font-medium">About Us</Link>
                <Link to="/privacy" className="text-slate-500 hover:text-teal-600 transition-colors font-medium">Privacy Policy</Link>
                <Link to="/terms" className="text-slate-500 hover:text-teal-600 transition-colors font-medium">Terms of Service</Link>
                <Link to="/api-docs" className="text-slate-500 hover:text-teal-600 transition-colors font-medium">API</Link>
            </div>
            <div className="mt-8 md:mt-0 md:order-1 flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center justify-center h-8 w-8 bg-teal-600 rounded-md">
                    <span className="font-bold text-white tracking-tighter text-sm">{appName.charAt(0)}</span>
                </div>
                <p className="text-center text-sm text-slate-500">&copy; {new Date().getFullYear()} {appName}. All rights reserved.</p>
            </div>
        </div>
      </footer>
    </div>
  );
};
