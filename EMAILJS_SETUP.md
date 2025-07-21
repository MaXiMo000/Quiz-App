# EmailJS Setup Instructions for Contact Form

## 🚀 Quick Setup Guide

### 1. EmailJS Account Setup
1. Go to [EmailJS.com](https://www.emailjs.com/)
2. Create a free account
3. Connect your email service (Gmail, Outlook, etc.)

### 2. Create Email Template
Create a template with these variables:
```
Subject: New Contact Form Message from {{from_name}}

From: {{from_name}} <{{from_email}}>
Message: {{message}}

Reply to: {{from_email}}
```

### 3. Get Your Credentials
- Service ID: Found in EmailJS dashboard > Email Services
- Template ID: Found in EmailJS dashboard > Email Templates  
- Public Key: Found in EmailJS dashboard > Account > API Keys

### 4. Environment Variables
Your `.env` file should contain:
```
VITE_CONTACT_SERVICE=your_service_id
VITE_CONTACT_TEMPLATE=your_template_id
VITE_CONTACT_KEY=your_public_key
```

### 5. Current Configuration
✅ EmailJS is installed (`@emailjs/browser`)
✅ Environment variables are configured
✅ Contact form is ready to use

## 🔧 Testing
1. Fill out the contact form
2. Check your email for the message
3. Verify all form fields are captured correctly

## 🛡️ Security Considerations
⚠️ **Note**: EmailJS credentials are exposed in frontend code
- This is normal for EmailJS public key
- Service limits prevent abuse
- For enterprise use, consider backend proxy

## 📧 Template Variables Used
- `from_name` - User's name
- `from_email` - User's email  
- `message` - User's message

## 🎨 Customization
You can modify the EmailJS template to include:
- Auto-reply messages
- HTML formatting
- Additional form fields
- Company branding
