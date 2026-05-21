import React from 'react';

export const PrivacyPolicyPage: React.FC<{ appName: string }> = ({ appName }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
      
      <div className="prose prose-slate prose-a:text-teal-600 lg:prose-lg max-w-none">
        <p className="text-sm text-slate-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <p>
          At {appName}, accessible from our application, one of our main priorities is the privacy of our visitors. 
          This Privacy Policy document contains types of information that is collected and recorded by {appName} and how we use it.
        </p>

        <h2>1. Information We Collect</h2>
        <p>
          We collect information to provide better services to all our users. The types of personal information we collect include:
        </p>
        <ul>
          <li><strong>Personal Identification Information:</strong> Name, email address, password, and profile data when you register an account.</li>
          <li><strong>API & Integration Data:</strong> When you connect third-party accounts (such as WordPress, Google Analytics, or Pinterest), we securely store the required access tokens to provide automated posting and analytics services.</li>
          <li><strong>Usage Data:</strong> We may collect data on how the service is accessed and used, including your computer's IP address, browser type, browser version, the pages of our service that you visit, the time and date of your visit, and other diagnostic data.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect in various ways, including to:</p>
        <ul>
          <li>Provide, operate, and maintain our application</li>
          <li>Improve, personalize, and expand our services</li>
          <li>Understand and analyze how you use our application</li>
          <li>Develop new products, services, features, and functionality</li>
          <li>Communicate with you for customer service, updates, and marketing</li>
          <li>Process transactions and manage related information, including subscriptions and integrations</li>
        </ul>

        <h2>3. Third-Party Integrations (Pinterest & Google)</h2>
        <p>
          Our application integrates with third-party APIs such as Pinterest (for automated Pin publishing) and Google (for authentication and analytics). We are committed to transparency in how we handle data from these platforms.
        </p>
        
        <h3>Pinterest API Integration</h3>
        <p>
          {appName} uses the Pinterest API to allow our users to create, schedule, and publish Pins directly from our dashboard to their connected Pinterest accounts. By authorizing {appName} to access your Pinterest account, you agree to the following data handling practices:
        </p>
        <ul>
          <li><strong>Data Collection:</strong> We collect and securely store your Pinterest OAuth access tokens, your Pinterest user ID, username, and profile image to identify your account within our app. We also fetch your public boards to allow you to select destinations for your Pins.</li>
          <li><strong>Data Usage:</strong> We only use your Pinterest data to perform actions you explicitly authorize: generating Pin drafts and publishing/scheduling Pins to the boards you select. We do not sell your Pinterest data.</li>
          <li><strong>Data Retention & Deletion:</strong> You can revoke {appName}'s access to your Pinterest account at any time either within our app's settings or directly from your Pinterest account settings. Upon revocation, we will delete your access tokens and associated Pinterest profile data from our databases within 30 days.</li>
          <li><strong>Compliance:</strong> We act in strict accordance with the <a href="https://policy.pinterest.com/en/developer-guidelines" target="_blank" rel="noopener noreferrer">Pinterest Developer Guidelines</a>. Users are prohibited from using our tool to generate spam, repetitive content, or otherwise violate Pinterest's community standards.</li>
        </ul>

        <h3>Google APIs</h3>
        <p>
          {appName}'s use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.
        </p>

        <h2>4. Data Security</h2>
        <p>
          The security of your data is important to us. We strive to use commercially acceptable means to protect your Personal Information. However, remember that no method of transmission over the Internet or method of electronic storage is 100% secure.
        </p>

        <h2>5. Cookies and Tracking Technologies</h2>
        <p>
          We use cookies and similar tracking technologies to track the activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
        </p>

        <h2>6. Changes to This Privacy Policy</h2>
        <p>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
        </p>

        <h2>7. Contact Us</h2>
        <p>
          If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us at support@{appName.toLowerCase().replace(/\s+/g, '')}.com.
        </p>
      </div>
    </div>
  );
};
