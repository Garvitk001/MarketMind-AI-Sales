import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

const TRANSLATIONS = {
  hi: {
    // Navigation & Sidebar
    'Dashboard': 'डैशबोर्ड',
    'AI Chat System': 'एआई चैट सिस्टम',
    'Sales Deals': 'बिक्री सौदे',
    'Inventory': 'स्टॉक इन्वेंटरी',
    'Customers': 'ग्राहक',
    'AI Recommender': 'एआई सिफारिशें',
    'Churn Analytics': 'ग्राहक रिटेंशन',
    'Anomaly Alerts': 'सुरक्षा अलर्ट',
    'Business Setup': 'बिजनेस सेटअप',
    'Team & Performance': 'टीम एवं प्रदर्शन',
    'Reports & Forecasts': 'रिपोर्ट एवं पूर्वानुमान',
    'Settings': 'सेटिंग्स',
    'Boost': 'ग्रोथ',
    'Retention': 'रिटेंशन',
    'Safeguard': 'सुरक्षा',
    'System Admin Console': 'सिस्टम एडमिन कंसोल',
    'System Administration': 'सिस्टम प्रशासन',

    // Dashboards & Headers
    'Business Owner': 'बिजनेस मालिक',
    'Business Owner View': 'बिजनेस मालिक अवलोकन',
    'Owner Access': 'मालिक पहुंच',
    'Total Revenue': 'कुल राजस्व',
    'Total Net Revenue': 'कुल शुद्ध राजस्व',
    'B2B Orders Processed': 'संसाधित B2B ऑर्डर्स',
    'Active Client Accounts': 'सक्रिय ग्राहक खाते',
    'Outstanding Credit Receivables': 'बकाया क्रेडिट प्राप्य',
    'Total Orders': 'कुल ऑर्डर',
    'Active Customers': 'सक्रिय ग्राहक',
    'Average Order Value': 'औसत ऑर्डर मूल्य',
    'AI Strategic Insights Engine': 'एआई रणनीतिक अंतर्दृष्टि इंजन',
    'Real-time predictive insights from your recommendations, churn, and safeguard engines.': 'आपकी एआई सिफारिशों, रिटेंशन और सुरक्षा इंजनों से रीयल-टाइम जानकारी।',
    'Top Revenue Products': 'शीर्ष राजस्व उत्पाद',
    'Top Products by Sales Volume': 'बिक्री मात्रा अनुसार शीर्ष उत्पाद',
    'Sales & Revenue Trend': 'बिक्री एवं राजस्व रुझान',
    'B2B Revenue Trend': 'B2B राजस्व रुझान',
    'Credit Receivables Aging': 'क्रेडिट प्राप्य आयु विश्लेषण',
    'Commercial buyer credit terms (Net 30/45)': 'व्यापारिक खरीदार क्रेडिट शर्तें (Net 30/45)',
    'Completed sales from the selected database period': 'चयनित अवधि की पूर्ण बिक्री',
    'Category Distribution': 'श्रेणी वितरण',
    'View AI Bundles': 'एआई बंडल देखें',
    'View At-Risk Clients': 'जोखिम वाले ग्राहक देखें',
    'Review Safeguards': 'सुरक्षा अलर्ट जांचें',
    'Live AI Engine': 'लाइव एआई इंजन',
    'Live Ledger': 'लाइव बहीखाता',
    'Recent B2B Invoices & Transactions': 'हालिया B2B इनवॉइस और लेनदेन',
    'Add your first business records': 'अपने पहले व्यावसायिक रिकॉर्ड जोड़ें',
    'Your workspace is correctly isolated. Use Business Setup to import products, inventory, sales, and customers.': 'आपका वर्कस्पेस सुरक्षित है। उत्पाद, इन्वेंटरी, बिक्री और ग्राहक जोड़ने के लिए बिजनेस सेटअप का उपयोग करें।',
    'Open Business Setup': 'बिजनेस सेटअप खोलें',

    // Store Manager & Inventory
    'Store Manager Operations Dashboard': 'स्टोर मैनेजर ऑपरेशन्स डैशबोर्ड',
    'Store Manager Operations': 'स्टोर मैनेजर ऑपरेशन्स',
    'Create Purchase Order': 'नया परचेज ऑर्डर बनाएं',
    'Total Active SKUs': 'कुल सक्रिय उत्पाद (SKUs)',
    'Low Stock Alert': 'कम स्टॉक अलर्ट',
    'Out of Stock': 'आउट ऑफ स्टॉक',
    'Pending Shipments': 'पेंडिंग शिपमेंट',
    'Low Stock Priority Queue': 'कम स्टॉक प्राथमिकता सूची',
    'Real-Time Stock Inventory': 'रीयल-टाइम स्टॉक इन्वेंटरी',
    'All Store Branches': 'सभी स्टोर शाखाएं',
    'Main Demo Store': 'मुख्य डेमो स्टोर',
    'Dispatch PO': 'पीओ डिस्पैच करें',
    'Send Email': 'ईमेल भेजें',
    'PO Number': 'पीओ नंबर',
    'Supplier': 'आपूर्तिकर्ता',
    'Stock Units': 'स्टॉक यूनिट्स',
    'Reorder Level': 'पुनः ऑर्डर स्तर',

    // Sales Executive & Deals
    'Sales Executive Dashboard': 'सेल्स एक्जीक्यूटिव डैशबोर्ड',
    'Sales Pipeline': 'बिक्री पाइपलाइन',
    'Monthly Sales Target': 'मासिक बिक्री लक्ष्य',
    'Pipeline Deals': 'पाइपलाइन सौदे',
    'Target Progress': 'लक्ष्य प्रगति',
    'Active Deals': 'सक्रिय सौदे',
    'Win Rate': 'सफलता दर',
    'All Payment Methods': 'सभी भुगतान विधियां',
    'UPI': 'यूपीआई (UPI)',
    'Cash': 'नकद (Cash)',
    'Bank Transfer': 'बैंक ट्रांसफर',
    'Credit / Net Terms': 'क्रेडिट / नेट शर्तें',
    'Filter Deals': 'सौदे फ़िल्टर करें',
    'Create New Deal': 'नया सौदा जोड़ें',
    'Stage': 'चरण',
    'Deal Value': 'सौदा मूल्य',
    'Expected Close': 'अपेक्षित समाप्ति',

    // Customers & B2B
    'B2B Customer Directory': 'B2B ग्राहक डायरेक्टरी',
    'Add New Client': 'नया ग्राहक जोड़ें',
    'Search Clients...': 'ग्राहक खोजें...',
    'Credit Limit': 'क्रेडिट सीमा',
    'Outstanding Balance': 'बकाया राशि',
    'Payment Terms': 'भुगतान शर्तें',
    'Company Name': 'कंपनी का नाम',
    'Contact Person': 'संपर्क व्यक्ति',
    'Phone Number': 'फ़ोन नंबर',
    'Email Address': 'ईमेल पता',

    // AI Recommender
    'AI-Powered Product Recommendations': 'एआई उत्पाद सिफारिशें',
    'Product Recommended Controls': 'उत्पाद सिफारिश नियंत्रण',
    'Target B2B Account': 'लक्षित B2B खाता',
    'Base Product / Anchor SKU': 'मूल उत्पाद / एंकर SKU',
    'All Categories': 'सभी श्रेणियां',
    'Confidence Score': 'विश्वसनीयता स्कोर',
    'Bundle Lift': 'बंडल वृद्धि दर',

    // Churn & Retention
    'At-Risk Customer Retention Center': 'ग्राहक रिटेंशन सेंटर',
    'Identify slipping accounts early and launch 1-click discount offers or executive calls to protect your revenue.': 'कम होते ग्राहकों को जल्दी पहचानें और 1-क्लिक ऑफर से अपना राजस्व बचाएं।',
    'Analyzed Accounts': 'विश्लेषण किए गए खाते',
    'High Risk Churn': 'उच्च जोखिम ग्राहक',
    'Revenue at Risk': 'जोखिम में राजस्व',
    'AI Retention Accuracy': 'एआई रिटेंशन सटीकता',
    'Churn Probability': 'छोड़ने की संभावना',
    'Retention Action': 'रिटेंशन कार्रवाई',

    // Safeguards & Anomalies
    'Business Safeguards & Fraud Protection': 'व्यापार सुरक्षा एवं धोखाधड़ी रोकथाम',
    'Automated safeguards scanning for unusual sales spikes, rapid stock depletion, and inventory leaks.': 'असामान्य बिक्री वृद्धि, तेजी से स्टॉक की कमी और रिसाव की स्वचालित जांच।',
    'Flagged Incidents': 'चिह्नित घटनाएं',
    'Critical Alerts': 'गंभीर अलर्ट',
    'Warning Anomalies': 'चेतावनी अलर्ट',
    'Unresolved Incidents': 'अनिर्णीत घटनाएं',
    'Detection Sensitivity': 'पहचान संवेदनशीलता',
    'Anomaly Type': 'विसंगति प्रकार',
    'Severity': 'गंभीरता',

    // Business Setup & Settings
    'Workspace Business Profile': 'वर्कस्पेस बिजनेस प्रोफ़ाइल',
    'Train & Refresh AI Models': 'एआई मॉडल प्रशिक्षित एवं रीफ्रेश करें',
    'Upload Logo / Photo': 'लोगो / फोटो अपलोड करें',
    'Save Configuration': 'कॉन्फ़िगरेशन सहेजें',
    'Business Name': 'व्यापार का नाम',
    'Store Name': 'स्टोर का नाम',
    'Currency': 'मुद्रा',
    'Timezone': 'समय क्षेत्र',
    'Profile Settings': 'प्रोफ़ाइल सेटिंग्स',
    'Team Members': 'टीम सदस्य',

    // Common Buttons & Actions
    'Search': 'खोजें',
    'Filter': 'फ़िल्टर',
    'Export CSV': 'सीएसवी निर्यात करें',
    'Print Invoice': 'इनवॉइस प्रिंट करें',
    'Download PDF': 'पीडीएफ डाउनलोड करें',
    'Save Changes': 'बदलाव सहेजें',
    'Cancel': 'रद्द करें',
    'Confirm': 'पुष्टि करें',
    'Refresh': 'रीफ्रेश',
    'Delete': 'हटाएं',
    'Edit': 'संपादित करें',
    'View': 'देखें',
    'Close': 'बंद करें',
    'Status': 'स्थिति',
    'Actions': 'कार्रवाई',
    'Date': 'तारीख',
    'Amount': 'राशि',
    'Invoice': 'इनवॉइस',

    // Date Filters
    'Today': 'आज',
    'Yesterday': 'कल',
    'Last 7 Days': 'पिछले 7 दिन',
    'Last 30 Days': 'पिछले 30 दिन',
    'Last 6 Months (180 Days)': 'पिछले 6 महीने (180 दिन)',
    'Custom Period': 'कस्टम अवधि'
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('marketmind.language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('marketmind.language', language);
  }, [language]);

  const t = (text, fallback) => {
    if (!text) return text;
    if (language === 'hi' && TRANSLATIONS.hi[text]) {
      return TRANSLATIONS.hi[text];
    }
    return fallback || text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    return { language: 'en', setLanguage: () => {}, t: (str) => str };
  }
  return context;
};
