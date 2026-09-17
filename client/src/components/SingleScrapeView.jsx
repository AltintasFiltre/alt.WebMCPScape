import React, { useState } from 'react';
import { Box, ExternalLink, Table, FileText, Check } from 'lucide-react';

const TABS = [
  { id: 'Specification', label: 'Teknik Özellikler', icon: Box },
  { id: 'OE Numaraları', label: 'OE Numaraları', icon: ExternalLink },
  { id: 'Araçlar / Uygulamalar', label: 'Araç Uyumlulukları', icon: Table }
];

/**
 * SingleScrapeView Component
 * (Single Responsibility: Tekil sayfa kazıma sonuçlarını sekmeler halinde sunar)
 */
export function SingleScrapeView({ data }) {
  const [activeTab, setActiveTab] = useState('Specification');
  const [copiedTab, setCopiedTab] = useState(null);

  if (!data) return null;

  const handleCopy = () => {
    const content =
      activeTab === 'Specification'
        ? data.Specification
        : activeTab === 'OE Numaraları'
        ? data.OENumbers
        : data.Vehicles;

    navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    setCopiedTab(activeTab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
      {/* Tabs */}
      <div className="flex border-b border-slate-100 overflow-x-auto bg-slate-50/50">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        <div className="flex justify-end mb-4">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-all text-xs font-medium"
          >
            {copiedTab === activeTab ? (
              <span className="text-green-600 flex items-center gap-1 font-bold">
                <Check className="w-3.5 h-3.5" /> Kopyalandı!
              </span>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5" /> JSON Kopyala
              </>
            )}
          </button>
        </div>

        {/* Specification Tab */}
        {activeTab === 'Specification' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.Specification?.map((item, idx) => (
              <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                  {item.key}
                </div>
                <div className="text-sm font-bold text-slate-800">{item.value}</div>
              </div>
            ))}
            {(!data.Specification || data.Specification.length === 0) && (
              <p className="text-slate-400 italic text-xs">Veri bulunamadı.</p>
            )}
          </div>
        )}

        {/* OE Numbers Tab */}
        {activeTab === 'OE Numaraları' && (
          <div className="space-y-4">
            {data.OENumbers?.map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <h3 className="font-bold text-slate-800 mb-2.5 flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-3 bg-blue-600 rounded-full"></div>
                  {item['Üretici Adı']}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {item.Oems?.map((oem, oIdx) => (
                    <span
                      key={oIdx}
                      className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-md text-xs font-mono font-semibold"
                    >
                      {oem}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {(!data.OENumbers || data.OENumbers.length === 0) && (
              <p className="text-slate-400 italic text-xs">Veri bulunamadı.</p>
            )}
          </div>
        )}

        {/* Vehicles Tab */}
        {activeTab === 'Araçlar / Uygulamalar' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50">
                  {data.Vehicles?.length > 0 &&
                    Object.keys(data.Vehicles[0]).map((header) => (
                      <th
                        key={header}
                        className="p-3 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.Vehicles?.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    {Object.values(row).map((val, vIdx) => (
                      <td key={vIdx} className="p-3 text-slate-600">
                        {val || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data.Vehicles || data.Vehicles.length === 0) && (
              <p className="text-slate-400 italic p-6 text-center text-xs">Veri bulunamadı.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
