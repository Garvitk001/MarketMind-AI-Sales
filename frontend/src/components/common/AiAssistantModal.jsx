import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Sparkles, Send, Bot, User, HelpCircle, FileText, Zap, Shield, HelpCircle as QuestionIcon, RefreshCw, MessageSquare, Building2, Package, ShoppingCart } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

const PAGE_CONTEXT_KNOWLEDGE = {
  dashboard: {
    title: 'Business Owner Dashboard',
    summary_en: 'This executive dashboard shows your total revenue, completed orders, active customers, and live AI strategic recommendation cards.',
    summary_hi: 'यह कार्यकारी डैशबोर्ड आपका कुल राजस्व, पूर्ण किए गए ऑर्डर, सक्रिय ग्राहक और लाइव एआई रणनीतिक सिफारिश कार्ड दिखाता है।',
    guide_en: '1. Click "View AI Bundles" to see product recommendations.\n2. Click "View At-Risk Clients" to launch customer retention campaigns.\n3. Click "Review Safeguards" to verify discount anomaly alerts.',
    guide_hi: '1. उत्पाद सिफारिशों को देखने के लिए "एआई बंडल देखें" पर क्लिक करें।\n2. ग्राहक रिटेंशन अभियान शुरू करने के लिए "जोखिम वाले ग्राहक देखें" पर क्लिक करें।\n3. छूट विसंगति अलर्ट सत्यापित करने के लिए "सुरक्षा अलर्ट जांचें" पर क्लिक करें।',
    action_en: 'To grow sales: Launch product cross-sell bundles and reach out to at-risk accounts showing 90+ days inactive recency.',
    action_hi: 'बिक्री बढ़ाने के लिए: उत्पाद क्रॉस-सेल बंडल लॉन्च करें और 90+ दिनों की निष्क्रियता वाले खातों से संपर्क करें।'
  },
  inventory: {
    title: 'Store Inventory & Supplier PO Workspace',
    summary_en: 'This page monitors live stock levels, low-stock alerts, safety thresholds, and lets you generate Purchase Orders for suppliers.',
    summary_hi: 'यह पेज लाइव स्टॉक स्तरों, कम स्टॉक अलर्ट, सुरक्षा सीमाओं की निगरानी करता है और आप आपूर्तिकर्ताओं के लिए परचेज ऑर्डर जनरेट कर सकते हैं।',
    guide_en: '1. Look at the Low Stock Priority Queue.\n2. Click "Generate PO" or "Create PO" on any product.\n3. Adjust reorder quantity and click "Download PO (CSV)" or "Email Supplier".',
    guide_hi: '1. कम स्टॉक प्राथमिकता सूची देखें।\n2. किसी भी उत्पाद पर "PO बनाएं" पर क्लिक करें।\n3. रीऑर्डर मात्रा समायोजित करें और "PO डाउनलोड करें (CSV)" या "ईमेल आपूर्तिकर्ता" पर क्लिक करें।',
    action_en: 'Keep minimum safety threshold above 5 units to eliminate stockout bottlenecks during peak customer demand.',
    action_hi: 'ग्राहक मांग के दौरान स्टॉकआउट से बचने के लिए न्यूनतम सुरक्षा सीमा 5 इकाइयों से ऊपर रखें।'
  },
  recommendations: {
    title: 'AI Product Recommendations (Boost)',
    summary_en: 'AI analyzes purchase co-occurrences to create high-converting product bundle pairings and boost Average Order Value (AOV).',
    summary_hi: 'एआई उच्च-रूपांतरण उत्पाद बंडल बनाने और औसत ऑर्डर मूल्य (AOV) बढ़ाने के लिए खरीदारी के सह-घटकों का विश्लेषण करता है।',
    guide_en: '1. Review recommended product pairs.\n2. Note the "Bundle Match Accuracy" and expected revenue lift (+18%).\n3. Pitch these pairings at checkout.',
    guide_hi: '1. अनुशंसित उत्पाद जोड़ियों की समीक्षा करें।\n2. "बंडल मैच सटीकता" और अपेक्षित राजस्व वृद्धि (+18%) नोट करें।\n3. चेकआउट के समय ग्राहकों को ये जोड़ियाँ सुझाएं।',
    action_en: 'Train sales executives to offer the recommended secondary item whenever a customer purchases a main product.',
    action_hi: 'जब भी कोई ग्राहक मुख्य उत्पाद खरीदे तो अनुशंसित दूसरा आइटम पेश करने के लिए बिक्री अधिकारियों को प्रशिक्षित करें।'
  },
  churn: {
    title: 'At-Risk Customer Retention Center',
    summary_en: 'Displays slipping accounts with high churn probability and provides 1-click WhatsApp and Email outreach tools.',
    summary_hi: 'उच्च चर्न संभावना वाले घटते खातों को प्रदर्शित करता है और 1-क्लिक व्हाट्सएप और ईमेल आउटरीच टूल प्रदान करता है।',
    guide_en: '1. Filter by High Churn Risk.\n2. Click "Email Offer" or "Call / WhatsApp".\n3. Open pre-filled pitch scripts and contact the client immediately.',
    guide_hi: '1. उच्च चर्न जोखिम द्वारा फ़िल्टर करें।\n2. "ईमेल ऑफ़र" या "कॉल / व्हाट्सएप" पर क्लिक करें।\n3. पूर्व-भरे पिच स्क्रिप खोलें और तुरंत ग्राहक से संपर्क करें।',
    action_en: 'Offering a 10% win-back discount to accounts inactive for >60 days usually recovers 40% of slipping revenue.',
    action_hi: '>60 दिनों से निष्क्रिय खातों को 10% विन-बैक छूट की पेशकश करने से आमतौर पर 40% गिरता हुआ राजस्व वापस आ जाता है।'
  },
  anomalies: {
    title: 'Business Safeguards & Fraud Protection',
    summary_en: 'Scans sales transactions for unauthorized discounts, inventory leaks, and rapid stock depletion spikes.',
    summary_hi: 'अनधिकृत छूट, इन्वेंट्री लीक और तेजी से स्टॉक में कमी के स्पाइक्स के लिए बिक्री लेनदेन को स्कैन करता है।',
    guide_en: '1. Choose Alert Sensitivity (Strict / Balanced / High).\n2. Review flagged incidents.\n3. Click "Acknowledge" to mark under investigation, or "Resolve" to clear.',
    guide_hi: '1. अलर्ट संवेदनशीलता (सख्त / संतुलित / उच्च) चुनें।\n2. चिह्नित घटनाओं की समीक्षा करें।\n3. जांच के तहत चिह्नित करने के लिए "स्वीकार करें" पर क्लिक करें, या साफ़ करने के लिए "हल करें" पर क्लिक करें।',
    action_en: 'Keep sensitivity on "Balanced" for normal operations, or switch to "Strict" during audit periods.',
    action_hi: 'सामान्य संचालन के लिए संवेदनशीलता को "संतुलित" पर रखें, या ऑडिट अवधि के दौरान "सख्त" पर स्विच करें।'
  },
  team: {
    title: 'Team Performance & AI Adoption Workspace',
    summary_en: 'Track sales executive targets, revenue metrics, and AI cross-sell recommendation adoption rates.',
    summary_hi: 'बिक्री कार्यकारी लक्ष्यों, राजस्व मेट्रिक्स और एआई क्रॉस-सेल सिफारिश गोद लेने की दरों को ट्रैक करें।',
    guide_en: '1. Search team member name.\n2. Click "Analyse" to open individual performance trends.\n3. Click "Download Performance Brief (CSV)" for evaluation reviews.',
    guide_hi: '1. टीम सदस्य का नाम खोजें।\n2. व्यक्तिगत प्रदर्शन रुझान खोलने के लिए "विश्लेषण" पर क्लिक करें।\n3. मूल्यांकन समीक्षा के लिए "प्रदर्शन संक्षिप्त विवरण (CSV)" डाउनलोड करें।',
    action_en: 'Reward sales executives with >85% AI Pitch Adoption to encourage cross-selling discipline.',
    action_hi: 'क्रॉस-सेलिंग अनुशासन को प्रोत्साहित करने के लिए >85% एआई पिच अपनाने वाले बिक्री अधिकारियों को पुरस्कृत करें।'
  },
  reports: {
    title: 'Reports & Forecasts Center',
    summary_en: 'Generates 7, 14, and 30-day AI revenue/demand forecasts with interactive Area, Line, and Bar charts.',
    summary_hi: 'इंटरएक्टिव एरिया, लाइन और बार चार्ट के साथ 7, 14 और 30-दिवसीय एआई राजस्व/मांग पूर्वानुमान जनरेट करता है।',
    guide_en: '1. Select Report type and Forecast Horizon (e.g. 30 Days).\n2. Toggle between Area, Line, or Bar Chart view.\n3. Click "Print / PDF" to download a clean executive report.',
    guide_hi: '1. रिपोर्ट प्रकार और पूर्वानुमान क्षितिज (जैसे 30 दिन) चुनें।\n2. एरिया, लाइन या बार चार्ट दृश्य के बीच स्विच करें।\n3. रिपोर्ट डाउनलोड करने के लिए "प्रिंट / पीडीएफ" पर क्लिक करें।',
    action_en: 'Use 30-day forecast bounds to negotiate bulk pricing discounts with primary wholesale suppliers.',
    action_hi: 'प्राथमिक थोक आपूर्तिकर्ताओं के साथ थोक मूल्य छूट पर बातचीत करने के लिए 30-दिवसीय पूर्वानुमान सीमाओं का उपयोग करें।'
  }
};

export const AiAssistantModal = ({ isOpen, onClose, activeTab = 'dashboard' }) => {
  const { language, t } = useLanguage();
  const { currentRole, profile, access, api } = useAuth() || {};
  const { salesTransactions = [], inventoryItems = [], customers = [] } = useData() || {};
  const isHindi = language === 'hi';

  const businessName = profile?.business_name || access?.tenant_name || 'Your Business';
  const skuCount = (inventoryItems || []).length;
  const orderCount = (salesTransactions || []).length;
  const clientCount = (customers || []).length;
  const categoriesList = [...new Set((inventoryItems || []).map((i) => i.product?.category || i.category).filter(Boolean))];
  const primaryCategory = categoriesList[0] || 'General Merchandise';
  
  const ctx = PAGE_CONTEXT_KNOWLEDGE[activeTab] || PAGE_CONTEXT_KNOWLEDGE.dashboard;

  const [query, setQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);

  // Initialize greeting dynamically grounded in the active business's telemetry
  useEffect(() => {
    const defaultGreeting = isHindi
      ? `नमस्ते! मैं **${businessName}** के लिए आपका निजी मार्केटमाइंड एआई बिजनेस कोपायलट हूं।\n\n🏢 **वर्तमान खाता**: ${businessName}\n📦 **सक्रिय उत्पाद**: ${skuCount} SKUs (${categoriesList.slice(0, 3).join(', ') || 'कैटलॉग'})\n👥 **सक्रिय ग्राहक**: ${clientCount} क्लाइंट्स\n\n📌 **वर्तमान पृष्ठ**: **${ctx.title}**\n${ctx.summary_hi}`
      : `Hello! I am your dedicated MarketMind AI Business Copilot for **${businessName}**.\n\n🏢 **Active Account**: ${businessName}\n📦 **Catalog**: ${skuCount} SKUs across ${categoriesList.length || 1} categories (${categoriesList.slice(0, 3).join(', ') || 'Wholesale'})\n👥 **Commercial Clients**: ${clientCount} active accounts\n\n📌 **Current View**: **${ctx.title}**\n${ctx.summary_en}`;

    setChatHistory([{ sender: 'ai', text: defaultGreeting }]);
  }, [activeTab, isHindi, ctx.title, ctx.summary_en, ctx.summary_hi, businessName, skuCount, clientCount, categoriesList]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isThinking]);

  const handleSend = async (customPromptText) => {
    const textToSend = customPromptText || query;
    if (!textToSend.trim()) return;

    setChatHistory((prev) => [...prev, { sender: 'user', text: textToSend }]);
    setQuery('');
    setIsThinking(true);

    try {
      const res = await api('/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({
          query: textToSend,
          tab: activeTab,
          language: language,
          business_name: businessName,
          sku_count: skuCount,
          orders_count: orderCount
        })
      });
      setIsThinking(false);
      setChatHistory((prev) => [...prev, { sender: 'ai', text: res.response }]);
    } catch {
      // Fallback personalized client intelligence strictly grounded in the business's data
      setTimeout(() => {
        setIsThinking(false);
        let aiResponse = '';
        const lower = textToSend.toLowerCase();

        if (lower.includes('summarize') || lower.includes('summary') || lower.includes('संक्षिप्त') || lower.includes('क्या है')) {
          aiResponse = isHindi 
            ? `📊 **${businessName} के लिए ${ctx.title} का विश्लेषण**:\n${ctx.summary_hi}\n\n🏢 **आपकी व्यावसायिक स्थिति**: आपके पास वर्तमान में ${skuCount} इन्वेंट्री उत्पाद और ${orderCount} रिकॉर्डेड लेनदेन हैं।`
            : `📊 **Analysis of ${ctx.title} for ${businessName}**:\n${ctx.summary_en}\n\n🏢 **Your Business Position**: Operating with ${skuCount} active SKUs and ${orderCount} recorded sales transactions.`;
        } else if (lower.includes('how') || lower.includes('use') || lower.includes('कैसे') || lower.includes('उपयोग')) {
          aiResponse = isHindi
            ? `📝 **${businessName} के लिए इस पेज का उपयोग कैसे करें**:\n${ctx.summary_hi}\n\nचरण:\n${ctx.guide_hi}`
            : `📝 **How ${businessName} can utilize this page**:\n${ctx.summary_en}\n\nAction Steps:\n${ctx.guide_en}`;
        } else if (lower.includes('sales') || lower.includes('growth') || lower.includes('बिक्री') || lower.includes('ग्रोथ')) {
          aiResponse = isHindi
            ? `🚀 **${businessName} के लिए बिक्री वृद्धि रणनीति**:\n1. आपकी प्राथमिक श्रेणी **${primaryCategory}** में शीर्ष उत्पादों के बंडल बनाएं।\n2. 60+ दिनों से निष्क्रिय ${Math.max(1, Math.round(clientCount * 0.2))} ग्राहकों को लक्षित विन-बैक ऑफर भेजें।\n3. ${ctx.action_hi}`
            : `🚀 **Sales Growth Strategy for ${businessName}**:\n1. Form high-margin product bundles around your primary **${primaryCategory}** lines.\n2. Target the ~${Math.max(1, Math.round(clientCount * 0.2))} dormant buyer accounts with timely re-order discounts.\n3. ${ctx.action_en}`;
        } else if (lower.includes('risk') || lower.includes('security') || lower.includes('जोखिम') || lower.includes('सुरक्षा')) {
          aiResponse = isHindi
            ? `🛡️ **${businessName} सुरक्षा और जोखिम रिपोर्ट**:\nआपके ${skuCount} उत्पादों में स्टॉकआउट या असामान्य छूट विसंगतियों की निरंतर जांच की जाती है। सुरक्षित मार्जिन बनाए रखने के लिए सुरक्षा अलर्ट की समीक्षा करें।`
            : `🛡️ **Safeguards & Risk Report for ${businessName}**:\nContinuous monitoring of your ${skuCount} inventory items for discount anomalies or rapid stock depletion. Review Safeguards alerts to protect bottom-line profitability.`;
        } else {
          aiResponse = isHindi
            ? `**${businessName}** के लिए **${ctx.title}** से संबंधित विश्लेषण:\n\n${ctx.summary_hi}\n\n👉 **सुझाया गया कदम**: ${ctx.action_hi}`
            : `Here is the custom analysis for **${businessName}** regarding **${ctx.title}**:\n\n${ctx.summary_en}\n\n👉 **Recommended Next Step**: ${ctx.action_en}`;
        }

        setChatHistory((prev) => [...prev, { sender: 'ai', text: aiResponse }]);
      }, 500);
    }
  };

  const presetButtons = [
    { label_en: '📊 Summarize Page', label_hi: '📊 पेज का सारांश', prompt: 'summarize this page' },
    { label_en: '❓ How to use this page?', label_hi: '❓ इस पेज का उपयोग कैसे करें?', prompt: 'how to use this page' },
    { label_en: '🚀 3 Steps to Increase Sales', label_hi: '🚀 बिक्री बढ़ाने के 3 कदम', prompt: 'give 3 steps to increase sales' },
    { label_en: '🛡️ Risk & Security Guidance', label_hi: '🛡️ जोखिम और सुरक्षा जानकारी', prompt: 'explain risk and security' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isHindi ? `एआई असिस्टेंट कोपायलट • ${ctx.title}` : `MarketMind AI Copilot • ${ctx.title}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Quick Action Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isHindi ? 'त्वरित प्रश्न:' : 'Quick Questions:'}
          </span>
          {presetButtons.map((b, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(b.prompt)}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/20 transition-all flex items-center gap-1"
            >
              <span>{isHindi ? b.label_hi : b.label_en}</span>
            </button>
          ))}
        </div>

        {/* Chat Stream Window */}
        <div className="h-64 sm:h-80 overflow-y-auto space-y-3 p-3 sm:p-4 rounded-xl bg-slate-950 border border-slate-800">
          {chatHistory.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed whitespace-pre-line ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20 font-medium'
                    : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-bl-none shadow-xs'
                }`}
              >
                {msg.text}
              </div>
              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 border border-slate-700">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium animate-pulse p-2">
              <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
              <span>{isHindi ? 'एआई उत्तर तैयार कर रहा है...' : 'AI Copilot analyzing page context...'}</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <Input
            id="aiQueryInput"
            placeholder={isHindi ? "प्रश्न पूछें या 'सारांश' टाइप करें..." : "Ask a question or type 'summarize'..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="text-xs bg-slate-950 border-slate-800 text-white"
          />
          <Button type="submit" icon={Send} disabled={!query.trim() || isThinking}>
            {isHindi ? 'भेजें' : 'Send'}
          </Button>
        </form>
      </div>
    </Modal>
  );
};
