// Contact Service - SECURITY GUIDE
// 🚨 CRITICAL: Move EmailJS credentials to backend!

/*
CURRENT SECURITY ISSUE:
- EmailJS credentials are exposed in frontend
- Anyone can see your service ID, template ID, and public key
- This can lead to API abuse and quota exhaustion

SECURE SOLUTION:
1. Create a backend endpoint: POST /api/contact
2. Move EmailJS credentials to backend environment variables
3. Frontend sends contact data to your backend
4. Backend handles EmailJS integration securely

BACKEND IMPLEMENTATION NEEDED:
```javascript
// backend/routes/contactRoutes.js
const emailjs = require('@emailjs/nodejs');

router.post('/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    // Server-side EmailJS call with secure credentials
    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      { name, email, message },
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY, // Only available server-side
      }
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});
```

FRONTEND UPDATE NEEDED:
```javascript
// frontend - Contact.jsx update
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    await axios.post('/api/contact', { name, email, message });
    // Success handling
  } catch (error) {
    // Error handling
  }
};
```
*/

// Temporary public configuration (REPLACE WITH BACKEND ENDPOINT)
export const contactConfig = {
  // ⚠️ WARNING: These should be moved to backend ASAP
  SERVICE_ID: import.meta.env.VITE_CONTACT_SERVICE,
  TEMPLATE_ID: import.meta.env.VITE_CONTACT_TEMPLATE,
  PUBLIC_KEY: import.meta.env.VITE_CONTACT_KEY,
  
  // Recommend immediate backend migration
  MIGRATION_NEEDED: true
};

export default contactConfig;
