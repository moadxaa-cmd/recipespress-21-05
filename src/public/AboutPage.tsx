import React from 'react';

export const AboutPage: React.FC<{ appName: string }> = ({ appName }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold text-slate-900 mb-8">About Us</h1>
      
      <div className="prose prose-slate lg:prose-lg">
        <p>
          Welcome to {appName}! We are passionate about helping food bloggers and creators streamline their workflow and focus on what they do best: creating delicious recipes. Our philosophy is simple: <strong>Create Once. Publish Everywhere.</strong>
        </p>
        
        <h2>Our Mission</h2>
        <p>
          Our mission is to provide an intuitive, AI-powered growth engine that eliminates the busywork of food blogging. We empower creators to turn a single recipe idea into a fully formatted, SEO-optimized WordPress post and a month's worth of Pinterest pins—automatically.
        </p>

        <h2>Who We Are</h2>
        <p>
          {appName} was built by a team of developers and content creators who understand the crushing workload of running a successful food blog. We've combined our expertise in advanced generative AI, Google's search algorithms, and Pinterest's visual discovery engine to create a tool tailored specifically for the culinary niche. By directly integrating with the WordPress API, Google's advanced language models, and the official Pinterest API, we offer a secure, reliable, and compliant way to scale your audience on autopilot.
        </p>
        
        <h2>Contact Information</h2>
        <p>We're always here to help. If you have any questions or concerns, please reach out to us:</p>
        <ul>
          <li><strong>Email:</strong> support@{appName.toLowerCase().replace(/\s+/g, '')}.com</li>
          <li><strong>Address:</strong> 123 Innovation Drive, Tech City, TC 90210, United States</li>
        </ul>
      </div>
    </div>
  );
};
