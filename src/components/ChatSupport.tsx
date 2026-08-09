import React, { useState } from 'react';
import { MessageSquare, Send, X, HelpCircle, Bot, Sparkles, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatSupportProps {
  isLight: boolean;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const ChatSupport: React.FC<ChatSupportProps> = ({
  isLight,
  showToast,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    { sender: 'bot', text: 'Hi! I am the Shree Intelligent ERP Assistant. How can I assist you with corporate tax templates, inventory reorders, or billing workflows today?' }
  ]);
  const [inputText, setInputText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInputText('');

    // Simulate instant smart bot answer
    setTimeout(() => {
      let botResponse = 'I am fully configured offline. For detailed customization, please explore "Settings ➔ Invoice Design" to customize dual signatures, religious headers, or PDF password locks!';
      const lowUser = userMsg.toLowerCase();
      if (lowUser.includes('invoice') || lowUser.includes('design') || lowUser.includes('pdf')) {
        botResponse = 'You can tweak watermarks, branding colors, header symbols, digital stamps, and configure multiple branch-wise templates under Settings ➔ Invoice Design. Design looks perfect on Android and Web!';
      } else if (lowUser.includes('hsn') || lowUser.includes('gst') || lowUser.includes('tax')) {
        botResponse = 'HSN tax columns automatically map GST rates. Standard rates: 8471 is 18%, 8415 is 28%, and pharmaceutical preparations operate on 5% rates.';
      } else if (lowUser.includes('backup')) {
        botResponse = 'You can trigger multi-layered encrypted database snapshots directly in Settings. Backup files can be exported as JSON templates anytime.';
      }

      setMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
      showToast('New guidance from Shree Billing Assistant!');
    }, 850);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className={`w-80 sm:w-96 h-[450px] rounded-2xl border shadow-2xl flex flex-col mb-4 overflow-hidden ${
              isLight
                ? 'bg-white border-slate-200 text-slate-800'
                : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-900 to-indigo-950 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                  <Bot className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
                    Shree Assistant <Sparkles className="h-3 w-3 text-yellow-400" />
                  </h4>
                  <p className="text-[8px] text-indigo-200 uppercase font-bold">Intelligent ERP Support</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-indigo-800/50 rounded transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Message Pane */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-none">
              {messages.map((m, idx) => {
                const isBot = m.sender === 'bot';
                return (
                  <div key={idx} className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'justify-end' : ''}`}>
                    {isBot && (
                      <div className="p-1 bg-indigo-500/10 text-indigo-500 rounded-lg shrink-0 mt-0.5">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div className={`p-3 rounded-2xl text-[10.5px] max-w-[75%] leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : (isLight ? 'bg-slate-100' : 'bg-slate-900 border border-slate-800') + ' rounded-tl-none'
                    }`}>
                      {m.text}
                    </div>
                    {!isBot && (
                      <div className="p-1 bg-slate-500/10 text-slate-400 rounded-lg shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSend} className="p-3 border-t dark:border-slate-850 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask assistant about design parameters..."
                className="flex-1 text-xs font-bold rounded-lg px-3 py-2 border dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl transition-all cursor-pointer active:scale-95 flex items-center justify-center"
      >
        <MessageSquare className="h-5 w-5" />
      </button>
    </div>
  );
};
export default ChatSupport;
