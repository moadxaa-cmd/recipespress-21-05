import React from 'react';

export const TermsPage: React.FC<{ appName: string }> = ({ appName }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold text-slate-900 mb-8">Terms of Service</h1>
      
      <div className="prose prose-slate prose-a:text-teal-600 lg:prose-lg max-w-none">
        <p className="text-sm text-slate-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using {appName}, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.
        </p>

        <h2>2. Use License</h2>
        <p>
          Permission is granted to temporarily download one copy of the materials (information or software) on {appName}'s website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
        </p>
        
        <h2>3. Acceptable Use and Platform Policies</h2>
        <p>
          When using {appName} to publish content to external platforms (such as WordPress, Google, or Pinterest), you agree to comply with the terms of service of those respective platforms. You must not:
        </p>
        <ul>
          <li>Generate or distribute spam, fraudulent, or deceptive content.</li>
          <li>Violate the intellectual property rights of others.</li>
          <li>Engage in abusive, harassing, or illegal behavior.</li>
          <li>Attempt to undermine the security or integrity of our application or connected APIs.</li>
        </ul>

        <h2>4. API Integrations & Automation Policies</h2>
        <p>
          {appName} facilitates interactions with third-party platforms via their official APIs. By utilizing our automation features, you agree to adhere to the policies of the connected platforms.
        </p>
        <ul>
            <li><strong>Pinterest:</strong> Your use of features integrating with the Pinterest API must strictly comply with the <a href="https://policy.pinterest.com/en/terms-of-service" target="_blank" rel="noopener noreferrer">Pinterest Terms of Service</a> and the <a href="https://policy.pinterest.com/en/developer-guidelines" target="_blank" rel="noopener noreferrer">Pinterest Developer Guidelines</a>. You are solely responsible for ensuring the content you generate and publish (or schedule) to Pinterest does not constitute spam, duplicate content violations, or infringe on copyright.</li>
            <li><strong>Google:</strong> Your use of Google-connected features must comply with Google's API Terms of Service. Authentication and interactions via Google are governed accordingly.</li>
        </ul>
        <p>
          <strong>Account Suspension:</strong> Misuse of automated posting tools that results in aggressive spamming or violates partner API guidelines may result in the immediate and permanent suspension of your {appName} account without refund. We reserve the right to throttle or block API requests originating from your account if we detect abusive patterns that could jeopardize our developer standing with platforms like Pinterest.
        </p>

        <h2>5. Disclaimer</h2>
        <p>
          The materials on {appName}'s website are provided on an 'as is' basis. {appName} makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
        </p>

        <h2>6. Limitations</h2>
        <p>
          In no event shall {appName} or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on {appName}'s website.
        </p>

        <h2>7. Revisions and Errata</h2>
        <p>
          The materials appearing on {appName}'s website could include technical, typographical, or photographic errors. {appName} does not warrant that any of the materials on its website are accurate, complete or current.
        </p>

        <h2>8. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at support@{appName.toLowerCase().replace(/\s+/g, '')}.com.
        </p>
      </div>
    </div>
  );
};
