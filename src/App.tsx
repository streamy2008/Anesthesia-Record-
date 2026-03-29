import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  FileText, 
  User, 
  Users, 
  Stethoscope, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Download,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  LineChart,
  QrCode,
  X
} from 'lucide-react';
import { VoiceInput } from './components/VoiceInput';
import { SignaturePad } from './components/SignaturePad';
import { VitalSignsChart } from './components/VitalSignsChart';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- Types ---

interface VitalSign {
  time: string;
  bp: string; // Format: "120/80"
  hr: string;
  spo2: string;
  rr: string;
  temp: string;
  sedation: string;
}

interface Medication {
  name: string;
  route: string;
  induction: string;
  additional: string;
  total: string;
}

interface FormData {
  // Basic Info
  name: string;
  gender: string;
  age: string;
  caseNo: string;
  dept: string;
  ward: string;
  height: string;
  weight: string;
  bmi: string;
  asa: string;
  emergency: string; // 急诊/择期
  examType: string[];
  examTypeOther: string;
  date: string;
  location: string;
  locationOther: string;

  // Personnel
  surgeons: string; // 手术医师
  anesthetists: string; // 麻醉医师
  anesthesiaNurse: string; // 麻醉护士
  circulatingNurse: string; // 巡回护士
  instrumentNurse: string; // 器械护士
  operatorSign: string;
  anesthetistSign: string;
  nurseSign: string;

  // Pre-assessment
  preOpDiagnosis: string;
  proposedSurgery: string;
  preOpMeds: string; // 术前用药
  fasting: string;
  mallampati: string;
  airwayOther: string[];
  bpPre: string;
  hrPre: string;
  circHistory: string[];
  respHistory: string[];
  allergy: string;
  anesthesiaHistory: string;
  preOpSpecial: string; // 术前特殊情况
  preCheck: string[];

  // Process
  anesthesiaMethod: string;
  position: string;
  vitals: VitalSign[];
  meds: Medication[];
  ventilation: string;
  fio2: string;
  oxygenFlow: string;
  spo2Min: string;
  spo2MinTime: string;
  etco2: string;

  // Adverse Events
  events: string[];
  eventDesc: string;
  eventAction: string[];
  eventActionOther: string;
  eventOutcome: string;

  // Summary
  startTime: string;
  endTime: string;
  totalDuration: string;
  effect: string;
  effectReason: string;
  specialEvents: string;
  recoveryQuality: string[];

  // Discharge
  dischargeTime: string;
  destination: string;
  destinationOther: string;
  aldrete: {
    activity: string;
    resp: string;
    circ: string;
    cons: string;
    spo2: string;
    total: string;
  };
  nrs: string;
  ponv: string;
  dischargeOrders: string[];
  dischargeOrdersOther: string;
  handoverAnesthetist: string;
  handoverReceiver: string;
  hospitalName: string;
  // Quality Control Overrides
  qcOverrides: {
    [key: string]: 'pass' | 'fail' | null;
  };
}

// --- Constants ---

const DRUG_LIST = [
  { name: '丙泊酚', unit: 'mg', suggestPerKg: 2.0 },
  { name: '依托咪酯', unit: 'mg', suggestPerKg: 0.25 },
  { name: '咪达唑仑', unit: 'mg', suggestPerKg: 0.03 },
  { name: '舒芬太尼', unit: 'μg', suggestPerKg: 0.07 },
  { name: '芬太尼', unit: 'μg', suggestPerKg: 0.7 },
  { name: '地佐辛', unit: 'mg', suggestPerKg: 0.07 },
  { name: '利多卡因', unit: 'mg', suggestPerKg: 1.2 },
  { name: '阿托品', unit: 'mg', suggestPerKg: 0.01 },
];

const initialData: FormData = {
  name: '', gender: '', age: '', caseNo: '', dept: '', ward: '', height: '', weight: '', bmi: '', asa: 'Ⅰ', emergency: '择期',
  examType: [], examTypeOther: '', date: new Date().toISOString().split('T')[0], location: '内镜中心', locationOther: '',
  surgeons: '', anesthetists: '', anesthesiaNurse: '', circulatingNurse: '', instrumentNurse: '', operatorSign: '', anesthetistSign: '', nurseSign: '',
  preOpDiagnosis: '', proposedSurgery: '', preOpMeds: '', fasting: '符合标准', mallampati: 'Ⅰ', airwayOther: [], bpPre: '', hrPre: '', circHistory: [], respHistory: [], allergy: '无', anesthesiaHistory: '无', preOpSpecial: '', preCheck: ['知情同意书已签', '身份核对完成', '急救设备备用'],
  anesthesiaMethod: '静脉全身麻醉', position: '左侧卧位',
  vitals: [
    { time: '入室', bp: '120/80', hr: '75', spo2: '98', rr: '16', temp: '36.5', sedation: '5' },
    { time: '诱导后', bp: '110/70', hr: '70', spo2: '99', rr: '14', temp: '', sedation: '2' },
    { time: '入镜', bp: '115/75', hr: '72', spo2: '98', rr: '15', temp: '', sedation: '1' },
    { time: '检查中', bp: '120/80', hr: '75', spo2: '98', rr: '16', temp: '', sedation: '1' },
    { time: '结束', bp: '125/85', hr: '78', spo2: '98', rr: '16', temp: '36.6', sedation: '4' }
  ],
  meds: [
    { name: '丙泊酚', route: '静脉', induction: '', additional: '', total: '' },
    { name: '瑞马唑仑', route: '静脉', induction: '', additional: '', total: '' }
  ],
  ventilation: '鼻导管吸氧', fio2: '', oxygenFlow: '', spo2Min: '', spo2MinTime: '', etco2: '未使用',
  events: [], eventDesc: '', eventAction: [], eventActionOther: '', eventOutcome: '恢复',
  startTime: '', endTime: '', totalDuration: '', effect: '满意', effectReason: '', specialEvents: '', recoveryQuality: ['平稳'],
  dischargeTime: '', destination: '返回原科室', destinationOther: '',
  aldrete: { activity: '2', resp: '2', circ: '2', cons: '2', spo2: '2', total: '10' },
  nrs: '0', ponv: '无', dischargeOrders: ['专人陪护', '不适随诊', '24小时内禁止驾车/高空作业'], dischargeOrdersOther: '',
  handoverAnesthetist: '', handoverReceiver: '',
  hospitalName: 'XX 医院',
  qcOverrides: {}
};

// --- Main Component ---

export default function App() {
  const [data, setData] = useState<FormData>(initialData);
  const [activeSection, setActiveSection] = useState<string>('basic');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [scannerTitle, setScannerTitle] = useState('扫描患者手环');
  const [scannerCallback, setScannerCallback] = useState<(text: string) => void>(() => {});
  const printRef = useRef<HTMLDivElement>(null);

  const updateData = (path: string, value: any) => {
    setData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current: any = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const handleVitalChange = (index: number, field: keyof VitalSign, value: string) => {
    const newVitals = [...data.vitals];
    newVitals[index] = { ...newVitals[index], [field]: value };
    updateData('vitals', newVitals);
  };

  const toggleArray = (path: string, item: string) => {
    const current = (data as any)[path] as string[];
    if (current.includes(item)) {
      updateData(path, current.filter(i => i !== item));
    } else {
      updateData(path, [...current, item]);
    }
  };

  const addVital = () => {
    updateData('vitals', [...data.vitals, { time: '', bp: '120/80', hr: '75', spo2: '98', rr: '16', temp: '', sedation: '' }]);
  };

  const removeVital = (index: number) => {
    updateData('vitals', data.vitals.filter((_, i) => i !== index));
  };

  const addMed = () => {
    updateData('meds', [...data.meds, { name: '', route: '静脉', induction: '', additional: '', total: '' }]);
  };

  const removeMed = (index: number) => {
    updateData('meds', data.meds.filter((_, i) => i !== index));
  };

  const exportPDF = async () => {
    if (!printRef.current || isExporting) return;
    
    setIsExporting(true);
    const printContainer = printRef.current.parentElement;
    
    // Use a more reliable "off-screen" but "visible" state
    if (printContainer) {
      printContainer.setAttribute('style', 'display: block !important; visibility: visible !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 210mm !important; height: auto !important; z-index: -1000 !important; opacity: 0.01 !important; pointer-events: none !important; background: white !important;');
    }

    try {
      // Wait for layout and images to stabilize
      await new Promise(resolve => setTimeout(resolve, 800));

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pages = printRef.current.querySelectorAll('.print-page');
      
      if (pages.length === 0) {
        throw new Error("未找到打印页面元素");
      }

      for (let i = 0; i < pages.length; i++) {
        const pageElement = pages[i] as HTMLElement;
        
        const canvas = await html2canvas(pageElement, { 
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 15000,
          onclone: (clonedDoc) => {
            // Ensure the cloned element is visible for capture
            const clonedPage = clonedDoc.querySelector('.print-page') as HTMLElement;
            if (clonedPage) {
              clonedPage.style.display = 'block';
              clonedPage.style.visibility = 'visible';
            }
          }
        });
        
        if (!canvas) throw new Error(`第 ${i + 1} 页渲染失败`);

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }
      
      const fileName = `麻醉记录单_${data.name || '未命名'}_${data.date}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert(`PDF 生成失败: ${error instanceof Error ? error.message : '未知错误'}。请确保浏览器未禁用相关权限并重试。`);
    } finally {
      if (printContainer) {
        printContainer.setAttribute('style', 'display: none !important;');
      }
      setIsExporting(false);
    }
  };

  const handlePatientScan = (text: string) => {
    try {
      // Simple parser for common formats
      let parsed: Partial<FormData> = {};
      if (text.startsWith('{')) {
        parsed = JSON.parse(text);
      } else if (text.includes('|')) {
        const [name, gender, age, caseNo] = text.split('|');
        parsed = { name, gender, age, caseNo };
      } else {
        parsed = { caseNo: text };
      }

      Object.entries(parsed).forEach(([key, value]) => {
        if (value) updateData(key, value);
      });
    } catch (e) {
      console.error("Failed to parse scanned data", e);
      updateData('caseNo', text);
    }
  };

  const openScanner = (title: string, onScan: (text: string) => void) => {
    setScannerTitle(title);
    setScannerCallback(() => onScan);
    setIsScannerOpen(true);
  };

  const ScannerModal = () => {
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
      if (!isScannerOpen) return;
      
      const startScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode("reader");
          scannerRef.current = html5QrCode;
          
          await html5QrCode.start(
            { facingMode: "environment" }, 
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              scannerCallback(decodedText);
              stopScanner();
              setIsScannerOpen(false);
            },
            (errorMessage) => {
              // Silently ignore scan errors
            }
          );
        } catch (err) {
          console.error("Unable to start scanner", err);
        }
      };

      const stopScanner = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
          try {
            await scannerRef.current.stop();
            scannerRef.current.clear();
          } catch (err) {
            console.warn("Scanner stop failed", err);
          }
        }
      };

      startScanner();

      return () => {
        stopScanner();
      };
    }, [isScannerOpen]);

    if (!isScannerOpen) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-2 text-blue-600">
              <QrCode size={20} />
              <h3 className="font-bold">{scannerTitle}</h3>
            </div>
            <button 
              onClick={() => setIsScannerOpen(false)} 
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <div id="reader" className="w-full rounded-xl overflow-hidden border-2 border-dashed border-slate-300"></div>
            <p className="mt-4 text-center text-sm text-slate-500">
              请将条码或二维码置于框内
            </p>
          </div>
        </div>
      </div>
    );
  };

  const SectionHeader = ({ id, title, icon: Icon }: { id: string, title: string, icon: any }) => (
    <div 
      onMouseEnter={() => setActiveSection(id)}
      className="group"
    >
      <button 
        onClick={() => setActiveSection(activeSection === id ? '' : id)}
        className={`w-full flex items-center justify-between p-4 mb-2 rounded-xl transition-all ${
          activeSection === id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon size={20} />
          <span className="font-semibold">{title}</span>
        </div>
        {activeSection === id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <FileText size={20} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-slate-800 leading-tight">{data.hospitalName}</h1>
            <span className="text-xs text-slate-500 font-medium">无痛胃肠镜麻醉记录</span>
          </div>
        </div>
        <button 
          onClick={exportPDF}
          disabled={isExporting}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-sm ${
            isExporting 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isExporting ? (
            <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
          ) : (
            <Download size={18} />
          )}
          <span>{isExporting ? '正在生成...' : '导出 PDF'}</span>
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <ScannerModal />
        {/* Section 1: Patient Info */}
        <div className="relative">
          <SectionHeader id="basic" title="一、患者信息" icon={User} />
          {activeSection === 'basic' && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                openScanner('扫描患者手环', handlePatientScan);
              }}
              className="absolute right-14 top-3 p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors z-10 flex items-center gap-1 text-xs font-bold"
            >
              <QrCode size={16} />
              <span>扫码录入</span>
            </button>
          )}
        </div>
        {activeSection === 'basic' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-xl shadow-sm mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-medium text-slate-600">医院名称</label>
              <VoiceInput value={data.hospitalName} onChange={(v) => updateData('hospitalName', v)} placeholder="输入医院名称" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">患者姓名</label>
              <VoiceInput value={data.name} onChange={(v) => updateData('name', v)} placeholder="输入姓名" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">性别</label>
              <div className="flex gap-4 p-2">
                {['男', '女'].map(g => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={data.gender === g} onChange={() => updateData('gender', g)} className="w-4 h-4 text-blue-600" />
                    <span>{g}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">年龄</label>
              <VoiceInput type="number" value={data.age} onChange={(v) => updateData('age', v)} placeholder="岁" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">病案号</label>
              <VoiceInput value={data.caseNo} onChange={(v) => updateData('caseNo', v)} placeholder="ID" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">科别</label>
              <VoiceInput value={data.dept} onChange={(v) => updateData('dept', v)} placeholder="科室名称" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">病房</label>
              <VoiceInput value={data.ward} onChange={(v) => updateData('ward', v)} placeholder="病房/病区" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">身高(cm)</label>
                <input type="number" value={data.height} onChange={(e) => updateData('height', e.target.value)} className="w-full p-2 border border-slate-300 rounded" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">体重(kg)</label>
                <input type="number" value={data.weight} onChange={(e) => updateData('weight', e.target.value)} className="w-full p-2 border border-slate-300 rounded" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">BMI</label>
                <input type="number" value={data.bmi} onChange={(e) => updateData('bmi', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">ASA分级</label>
              <select value={data.asa} onChange={(e) => updateData('asa', e.target.value)} className="w-full p-2 border border-slate-300 rounded">
                {['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'E'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">手术类型</label>
              <div className="flex gap-4 p-2">
                {['择期', '急诊'].map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={data.emergency === v} onChange={() => updateData('emergency', v)} className="w-4 h-4 text-blue-600" />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-medium text-slate-600">检查类型</label>
              <div className="flex flex-wrap gap-3 p-2 bg-slate-50 rounded-lg">
                {['胃镜', '结肠镜', '胃镜+结肠镜', '小肠镜'].map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={data.examType.includes(t)} onChange={() => toggleArray('examType', t)} className="w-4 h-4 rounded text-blue-600" />
                    <span>{t}</span>
                  </label>
                ))}
                <div className="flex items-center gap-2">
                  <span>其他:</span>
                  <input value={data.examTypeOther} onChange={(e) => updateData('examTypeOther', e.target.value)} className="border-b border-slate-300 bg-transparent outline-none" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Section 2: Personnel */}
        <div className="relative">
          <SectionHeader id="personnel" title="二、人员信息" icon={Users} />
          {activeSection === 'personnel' && (
            <div className="absolute right-14 top-3 flex gap-2 z-10">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openScanner('扫描人员工牌', (text) => {
                    // Simple logic: if it's a name, use it. If it's JSON, parse it.
                    if (text.startsWith('{')) {
                      const p = JSON.parse(text);
                      if (p.operator) updateData('operator', p.operator);
                      if (p.anesthetist) updateData('anesthetist', p.anesthetist);
                      if (p.nurse) updateData('nurse', p.nurse);
                    } else {
                      // If just text, we don't know which one it is, 
                      // but we can provide individual scan buttons below instead if needed.
                      // For now, let's assume a generic personnel scan might be less useful 
                      // than individual ones, but we'll keep this as a "quick fill" if format matches.
                    }
                  });
                }}
                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 text-xs font-bold"
              >
                <QrCode size={16} />
                <span>扫码录入</span>
              </button>
            </div>
          )}
        </div>
        {activeSection === 'personnel' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-xl shadow-sm mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">手术医师</label>
                <button onClick={() => openScanner('扫描手术医师', (t) => updateData('surgeons', t))} className="text-blue-600 hover:text-blue-800"><QrCode size={14} /></button>
              </div>
              <VoiceInput value={data.surgeons} onChange={(v) => updateData('surgeons', v)} placeholder="姓名" />
              <SignaturePad label="医师签名" onSave={(s) => updateData('operatorSign', s)} />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">麻醉医师</label>
                <button onClick={() => openScanner('扫描麻醉医师', (t) => updateData('anesthetists', t))} className="text-blue-600 hover:text-blue-800"><QrCode size={14} /></button>
              </div>
              <VoiceInput value={data.anesthetists} onChange={(v) => updateData('anesthetists', v)} placeholder="姓名" />
              <SignaturePad label="麻醉医师签名" onSave={(s) => updateData('anesthetistSign', s)} />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">麻醉护士</label>
                <button onClick={() => openScanner('扫描麻醉护士', (t) => updateData('anesthesiaNurse', t))} className="text-blue-600 hover:text-blue-800"><QrCode size={14} /></button>
              </div>
              <VoiceInput value={data.anesthesiaNurse} onChange={(v) => updateData('anesthesiaNurse', v)} placeholder="姓名" />
              <SignaturePad label="护士签名" onSave={(s) => updateData('nurseSign', s)} />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">巡回护士</label>
                <button onClick={() => openScanner('扫描巡回护士', (t) => updateData('circulatingNurse', t))} className="text-blue-600 hover:text-blue-800"><QrCode size={14} /></button>
              </div>
              <VoiceInput value={data.circulatingNurse} onChange={(v) => updateData('circulatingNurse', v)} placeholder="姓名" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">器械护士</label>
                <button onClick={() => openScanner('扫描器械护士', (t) => updateData('instrumentNurse', t))} className="text-blue-600 hover:text-blue-800"><QrCode size={14} /></button>
              </div>
              <VoiceInput value={data.instrumentNurse} onChange={(v) => updateData('instrumentNurse', v)} placeholder="姓名" />
            </div>
          </motion.div>
        )}

        {/* Section 3: Pre-assessment */}
        <SectionHeader id="pre" title="三、麻醉前评估" icon={Stethoscope} />
        {activeSection === 'pre' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-xl shadow-sm mb-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">术前诊断</label>
                <VoiceInput value={data.preOpDiagnosis} onChange={(v) => updateData('preOpDiagnosis', v)} placeholder="输入术前诊断" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">拟施手术</label>
                <VoiceInput value={data.proposedSurgery} onChange={(v) => updateData('proposedSurgery', v)} placeholder="输入拟施手术" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">术前用药</label>
                <VoiceInput value={data.preOpMeds} onChange={(v) => updateData('preOpMeds', v)} placeholder="输入术前用药" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">术前特殊情况</label>
                <VoiceInput value={data.preOpSpecial} onChange={(v) => updateData('preOpSpecial', v)} placeholder="输入术前特殊情况" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">禁食禁饮</label>
                <div className="flex gap-4">
                  {['符合标准', '不符合'].map(v => (
                    <label key={v} className="flex items-center gap-2">
                      <input type="radio" checked={data.fasting === v} onChange={() => updateData('fasting', v)} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Mallampati 分级</label>
                <div className="flex gap-3">
                  {['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'].map(v => (
                    <button 
                      key={v} 
                      onClick={() => updateData('mallampati', v)}
                      className={`px-3 py-1 rounded border ${data.mallampati === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300'}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">气道其他风险</label>
              <div className="flex flex-wrap gap-3">
                {['假牙', '缺齿', '鼾症/OSA史'].map(item => (
                  <label key={item} className="flex items-center gap-2">
                    <input type="checkbox" checked={data.airwayOther.includes(item)} onChange={() => toggleArray('airwayOther', item)} />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-600">过敏史 & 既往史</label>
              <VoiceInput value={data.allergy} onChange={(v) => updateData('allergy', v)} placeholder="过敏史" />
              <VoiceInput value={data.anesthesiaHistory} onChange={(v) => updateData('anesthesiaHistory', v)} placeholder="既往麻醉史" />
            </div>
          </motion.div>
        )}

        {/* Section 4: Process */}
        <SectionHeader id="process" title="四、麻醉过程记录" icon={Activity} />
        {activeSection === 'process' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-xl shadow-sm mb-4 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">麻醉方式</label>
                <VoiceInput value={data.anesthesiaMethod} onChange={(v) => updateData('anesthesiaMethod', v)} placeholder="如：静脉全身麻醉" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">手术体位</label>
                <VoiceInput value={data.position} onChange={(v) => updateData('position', v)} placeholder="如：左侧卧位" />
              </div>
            </div>
            {/* Interactive Chart */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold border-l-4 border-blue-600 pl-2">
                <LineChart size={18} />
                <h3>术中监测</h3>
              </div>
              <VitalSignsChart 
                data={data.vitals} 
                onChange={handleVitalChange} 
                onBulkChange={(newData) => updateData('vitals', newData)} 
              />
            </div>

            {/* Vital Signs Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border p-2 text-left">时间/节点</th>
                    <th className="border p-2">BP(mmHg)</th>
                    <th className="border p-2">HR(bpm)</th>
                    <th className="border p-2">SpO₂(%)</th>
                    <th className="border p-2">RR</th>
                    <th className="border p-2">体温(℃)</th>
                    <th className="border p-2">镇静评分</th>
                    <th className="border p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.vitals.map((v, i) => (
                    <tr key={i}>
                      <td className="border p-1"><input value={v.time} onChange={(e) => handleVitalChange(i, 'time', e.target.value)} className="w-full bg-transparent outline-none" /></td>
                      <td className="border p-1"><input value={v.bp} onChange={(e) => handleVitalChange(i, 'bp', e.target.value)} className="w-full text-center bg-transparent outline-none" /></td>
                      <td className="border p-1"><input value={v.hr} onChange={(e) => handleVitalChange(i, 'hr', e.target.value)} className="w-full text-center bg-transparent outline-none" /></td>
                      <td className="border p-1"><input value={v.spo2} onChange={(e) => handleVitalChange(i, 'spo2', e.target.value)} className="w-full text-center bg-transparent outline-none" /></td>
                      <td className="border p-1"><input value={v.rr} onChange={(e) => handleVitalChange(i, 'rr', e.target.value)} className="w-full text-center bg-transparent outline-none" /></td>
                      <td className="border p-1"><input value={v.temp} onChange={(e) => handleVitalChange(i, 'temp', e.target.value)} className="w-full text-center bg-transparent outline-none" /></td>
                      <td className="border p-1"><input value={v.sedation} onChange={(e) => handleVitalChange(i, 'sedation', e.target.value)} className="w-full text-center bg-transparent outline-none" /></td>
                      <td className="border p-1 text-center">
                        <button onClick={() => removeVital(i)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={addVital} className="mt-2 flex items-center gap-1 text-blue-600 text-sm font-medium hover:underline">
                <Plus size={16} /> 添加记录点
              </button>
            </div>

            {/* Medications */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 border-l-4 border-blue-600 pl-2">麻醉用药</h3>
                <div className="flex flex-wrap gap-2 justify-end">
                  {DRUG_LIST.map(drug => (
                    <button
                      key={drug.name}
                      onClick={() => {
                        const weight = parseFloat(data.weight) || 60;
                        const suggested = (drug.suggestPerKg * weight).toFixed(1);
                        const newMeds = [...data.meds, { name: drug.name, induction: suggested, additional: '', total: suggested }];
                        updateData('meds', newMeds);
                      }}
                      className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                      + {drug.name}
                    </button>
                  ))}
                </div>
              </div>
              <datalist id="drug-list">
                {DRUG_LIST.map(d => <option key={d.name} value={d.name} />)}
              </datalist>
              <div className="grid grid-cols-1 gap-3">
                {data.meds.map((m, i) => {
                  const drugInfo = DRUG_LIST.find(d => d.name === m.name);
                  const weight = parseFloat(data.weight) || 60;
                  const suggested = drugInfo ? (drugInfo.suggestPerKg * weight).toFixed(1) : null;
                  
                  return (
                    <div key={i} className="flex flex-wrap gap-2 items-end bg-slate-50 p-3 rounded-lg relative">
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-xs text-slate-500">药物名称</label>
                        <input 
                          list="drug-list"
                          value={m.name} 
                          onChange={(e) => {
                            const newMeds = [...data.meds];
                            newMeds[i].name = e.target.value;
                            updateData('meds', newMeds);
                          }} 
                          className="w-full p-1 border-b border-slate-300 bg-transparent" 
                        />
                      </div>
                      <div className="w-20">
                        <label className="text-xs text-slate-500 flex justify-between">
                          <span>诱导({drugInfo?.unit || 'mg'})</span>
                          {suggested && <span className="text-[10px] text-blue-500">建议:{suggested}</span>}
                        </label>
                        <input value={m.induction} onChange={(e) => {
                          const newMeds = [...data.meds];
                          newMeds[i].induction = e.target.value;
                          updateData('meds', newMeds);
                        }} className="w-full p-1 border-b border-slate-300 bg-transparent text-center" />
                      </div>
                      <div className="w-24">
                        <label className="text-xs text-slate-500">追加</label>
                        <input value={m.additional} onChange={(e) => {
                          const newMeds = [...data.meds];
                          newMeds[i].additional = e.target.value;
                          updateData('meds', newMeds);
                        }} className="w-full p-1 border-b border-slate-300 bg-transparent text-center" />
                      </div>
                      <div className="w-20">
                        <label className="text-xs text-slate-500 font-bold">总量</label>
                        <input value={m.total} onChange={(e) => {
                          const newMeds = [...data.meds];
                          newMeds[i].total = e.target.value;
                          updateData('meds', newMeds);
                        }} className="w-full p-1 border-b border-slate-300 bg-transparent text-center font-bold" />
                      </div>
                      <button onClick={() => removeMed(i)} className="text-red-500 p-1"><Trash2 size={16} /></button>
                    </div>
                  );
                })}
                <button onClick={addMed} className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:underline">
                  <Plus size={16} /> 添加药物
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Section 5: Adverse Events */}
        <SectionHeader id="events" title="五、不良事件记录" icon={AlertTriangle} />
        {activeSection === 'events' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-xl shadow-sm mb-4 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">不良事件类型</label>
              <div className="flex flex-wrap gap-3">
                {['低血压', '高血压', '低氧血症', '呼吸暂停', '返流误吸', '心动过缓', '体动', '呃逆', '非计划气管插管'].map(e => (
                  <label key={e} className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-200 cursor-pointer hover:bg-slate-100">
                    <input type="checkbox" checked={data.events.includes(e)} onChange={() => toggleArray('events', e)} className="rounded text-red-500" />
                    <span>{e}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">事件描述</label>
              <VoiceInput type="textarea" value={data.eventDesc} onChange={(v) => updateData('eventDesc', v)} placeholder="具体描述事件发生情况..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">处理措施</label>
              <div className="flex flex-wrap gap-3 mb-2">
                {['吸氧', '辅助呼吸', '气管插管', '药物处理', '暂停操作', '终止操作'].map(a => (
                  <label key={a} className="flex items-center gap-2">
                    <input type="checkbox" checked={data.eventAction.includes(a)} onChange={() => toggleArray('eventAction', a)} />
                    <span>{a}</span>
                  </label>
                ))}
              </div>
              <VoiceInput value={data.eventActionOther} onChange={(v) => updateData('eventActionOther', v)} placeholder="其他处理措施..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">转归</label>
              <div className="flex gap-4">
                {['好转', '未好转', '加重', '死亡'].map(v => (
                  <label key={v} className="flex items-center gap-2">
                    <input type="radio" checked={data.eventOutcome === v} onChange={() => updateData('eventOutcome', v)} />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Section 6: Summary */}
        <SectionHeader id="summary" title="六、麻醉小结" icon={CheckCircle2} />
        {activeSection === 'summary' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-xl shadow-sm mb-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-500">开始时间</label>
                  <input type="time" value={data.startTime} onChange={(e) => updateData('startTime', e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-500">结束时间</label>
                  <input type="time" value={data.endTime} onChange={(e) => updateData('endTime', e.target.value)} className="w-full p-2 border rounded" />
                </div>
              </div>
              <VoiceInput value={data.totalDuration} onChange={(v) => updateData('totalDuration', v)} placeholder="总时长 (分钟)" />
            </div>
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-600">麻醉效果</label>
              <div className="flex gap-4">
                {['满意', '欠佳'].map(v => (
                  <label key={v} className="flex items-center gap-2">
                    <input type="radio" checked={data.effect === v} onChange={() => updateData('effect', v)} />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
              {data.effect === '欠佳' && <VoiceInput value={data.effectReason} onChange={(v) => updateData('effectReason', v)} placeholder="原因描述" />}
            </div>
          </motion.div>
        )}

        {/* Section 7: Discharge */}
        <SectionHeader id="discharge" title="七、离室评估" icon={CheckCircle2} />
        {activeSection === 'discharge' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-xl shadow-sm mb-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">离室时间</label>
                <input type="time" value={data.dischargeTime} onChange={(e) => updateData('dischargeTime', e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">离室去向</label>
                <select value={data.destination} onChange={(e) => updateData('destination', e.target.value)} className="w-full p-2 border rounded">
                  {['返回原科室', '留观', '转入急诊/病房', '其他'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                {data.destination === '其他' && <VoiceInput value={data.destinationOther} onChange={(v) => updateData('destinationOther', v)} placeholder="其他去向描述" />}
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">Aldrete 评分</label>
                <span className="text-lg font-bold text-blue-600">总分: {data.aldrete.total}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { id: 'activity', label: '活动度', options: ['0:不能动', '1:能动2肢', '2:能动4肢'] },
                  { id: 'resp', label: '呼吸', options: ['0:呼吸暂停', '1:呼吸困难', '2:呼吸平稳'] },
                  { id: 'circ', label: '循环', options: ['0:BP变>50%', '1:BP变20-50%', '2:BP变<20%'] },
                  { id: 'cons', label: '神志', options: ['0:无反应', '1:唤醒有反应', '2:清醒'] },
                  { id: 'spo2', label: 'SpO₂', options: ['0:吸氧<90%', '1:吸氧>90%', '2:空气>92%'] }
                ].map((item) => (
                  <div key={item.id} className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">{item.label}</label>
                    <select 
                      value={data.aldrete[item.id]} 
                      onChange={(e) => {
                        const newAldrete = { ...data.aldrete, [item.id]: e.target.value };
                        const total = Object.entries(newAldrete)
                          .filter(([k]) => k !== 'total')
                          .reduce((acc, [_, v]) => acc + (parseInt(v as string) || 0), 0);
                        updateData('aldrete', { ...newAldrete, total: total.toString() });
                      }}
                      className="w-full p-2 border rounded text-xs"
                    >
                      {item.options.map((opt, idx) => <option key={idx} value={idx}>{opt}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">PONV (恶心呕吐)</label>
                <div className="flex gap-4 p-2">
                  {['无', '轻度', '中度', '重度'].map(v => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={data.ponv === v} onChange={() => updateData('ponv', v)} className="w-4 h-4 text-blue-600" />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">NRS 疼痛评分</label>
                <input type="range" min="0" max="10" value={data.nrs} onChange={(e) => updateData('nrs', e.target.value)} className="w-full" />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0 (无痛)</span>
                  <span>10 (剧痛)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">交接麻醉医师</label>
                <VoiceInput value={data.handoverAnesthetist} onChange={(v) => updateData('handoverAnesthetist', v)} placeholder="姓名" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">接收人员</label>
                <VoiceInput value={data.handoverReceiver} onChange={(v) => updateData('handoverReceiver', v)} placeholder="姓名" />
              </div>
            </div>
            <div className="space-y-2 border-t pt-4">
              <label className="text-sm font-medium text-slate-600">离室医嘱</label>
              <div className="flex flex-wrap gap-3 mb-2">
                {['专人陪护', '不适随诊', '24小时内禁止驾车/高空作业'].map(o => (
                  <label key={o} className="flex items-center gap-2">
                    <input type="checkbox" checked={data.dischargeOrders.includes(o)} onChange={() => toggleArray('dischargeOrders', o)} />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
              <VoiceInput value={data.dischargeOrdersOther} onChange={(v) => updateData('dischargeOrdersOther', v)} placeholder="其他医嘱..." />
            </div>
          </motion.div>
        )}

        {/* Section 8: Quality Control */}
        <SectionHeader id="qc" title="八、质控统计" icon={CheckCircle2} />
        {activeSection === 'qc' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-xl shadow-sm mb-4 space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'hypoxemia', label: '低氧血症发生率 (SpO₂<90%)', target: '<5%', calc: () => data.vitals.some(v => parseInt(v.spo2) < 90) },
                { id: 'intubation', label: '非计划气管插管率', target: '0', calc: () => data.events.includes('非计划气管插管') },
                { id: 'hospitalization', label: '非计划住院/留观率', target: '<1%', calc: () => data.destination === '转入急诊/病房' },
                { id: 'delayedRecovery', label: '苏醒延迟率 (>30分钟)', target: '<1%', calc: () => parseInt(data.totalDuration) > 30 },
                { id: 'reflux', label: '返流误吸发生率', target: '0', calc: () => data.events.includes('返流误吸') }
              ].map((item) => {
                const autoStatus = item.calc() ? 'fail' : 'pass';
                const currentStatus = data.qcOverrides[item.id] || autoStatus;
                
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700">{item.label}</span>
                        {!data.qcOverrides[item.id] && (
                          <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">自动计算</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">目标值: {item.target}</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => updateData(`qcOverrides.${item.id}`, 'pass')}
                        className={`px-3 py-1 text-xs rounded border transition-all ${
                          currentStatus === 'pass' 
                            ? 'bg-green-600 text-white border-green-600 shadow-sm' 
                            : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        达标
                      </button>
                      <button 
                        onClick={() => updateData(`qcOverrides.${item.id}`, 'fail')}
                        className={`px-3 py-1 text-xs rounded border transition-all ${
                          currentStatus === 'fail' 
                            ? 'bg-red-600 text-white border-red-600 shadow-sm' 
                            : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        不达标
                      </button>
                      {data.qcOverrides[item.id] && (
                        <button 
                          onClick={() => {
                            const newOverrides = { ...data.qcOverrides };
                            delete newOverrides[item.id];
                            updateData('qcOverrides', newOverrides);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          title="恢复自动计算"
                        >
                          <Activity size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </main>

      {/* Hidden Print Content - Use visibility hidden instead of display none for better capture */}
      <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', visibility: 'hidden' }}>
        <div ref={printRef} className="print-root">
          {/* Page 1: Main Record */}
          <div className="print-page w-[210mm] h-[297mm] p-[15mm] bg-white text-[9pt] leading-tight font-serif relative overflow-hidden">
            <div className="text-center mb-4">
              <h1 className="text-lg font-bold">{data.hospitalName}</h1>
              <h2 className="text-2xl font-bold tracking-[0.5em] mt-1">麻醉记录</h2>
              <div className="flex justify-end text-[8pt] mt-1">第 1 页</div>
            </div>

            {/* Patient Info Grid */}
            <div className="border-t border-l border-black">
              <div className="grid grid-cols-10 border-b border-black">
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold">科别</div>
                <div className="col-span-1 border-r border-black p-1">{data.dept}</div>
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold">病房</div>
                <div className="col-span-1 border-r border-black p-1">{data.ward}</div>
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold">姓名</div>
                <div className="col-span-1 border-r border-black p-1">{data.name}</div>
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold">性别</div>
                <div className="col-span-1 border-r border-black p-1">{data.gender}</div>
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold">年龄</div>
                <div className="col-span-1 border-r border-black p-1">{data.age}</div>
              </div>
              <div className="grid grid-cols-10 border-b border-black">
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold">身高</div>
                <div className="col-span-1 border-r border-black p-1">{data.height}cm</div>
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold">体重</div>
                <div className="col-span-1 border-r border-black p-1">{data.weight}kg</div>
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold">BMI</div>
                <div className="col-span-1 border-r border-black p-1">{data.bmi}</div>
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold">日期</div>
                <div className="col-span-1 border-r border-black p-1">{data.date}</div>
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold">病历号</div>
                <div className="col-span-1 border-r border-black p-1">{data.caseNo}</div>
              </div>
              <div className="grid grid-cols-10 border-b border-black">
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold">ASA</div>
                <div className="col-span-1 border-r border-black p-1">{data.asa}</div>
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold">手术类型</div>
                <div className="col-span-1 border-r border-black p-1">{data.emergency}</div>
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold">禁食</div>
                <div className="col-span-1 border-r border-black p-1">{data.fasting}</div>
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold">体位</div>
                <div className="col-span-3 border-r border-black p-1">{data.position}</div>
              </div>
              <div className="grid grid-cols-10 border-b border-black">
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold h-12 flex items-center">术前诊断</div>
                <div className="col-span-4 border-r border-black p-1">{data.preOpDiagnosis}</div>
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold h-12 flex items-center">拟施手术</div>
                <div className="col-span-4 border-r border-black p-1">{data.proposedSurgery}</div>
              </div>
              <div className="grid grid-cols-10 border-b border-black">
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold">术前用药</div>
                <div className="col-span-4 border-r border-black p-1">{data.preOpMeds}</div>
                <div className="col-span-1 border-r border-black p-1 bg-slate-50 font-bold">特殊情况</div>
                <div className="col-span-4 border-r border-black p-1">{data.preOpSpecial}</div>
              </div>
            </div>

            {/* Main Record Area */}
            <div className="mt-4 border border-black h-[140mm] flex">
              {/* Left: Meds/Fluids Labels */}
              <div className="w-[40mm] border-r border-black flex flex-col">
                <div className="h-8 border-b border-black bg-slate-50 flex items-center justify-center font-bold">时间 (min)</div>
                <div className="flex-1 p-1">
                  <div className="font-bold border-b border-black mb-1">麻醉药/液体:</div>
                  {data.meds.map((m, i) => (
                    <div key={i} className="text-[7pt] truncate">{m.name}</div>
                  ))}
                  <div className="mt-4 font-bold border-b border-black mb-1">出量:</div>
                  <div className="text-[7pt]">出血量: {data.events.includes('出血') ? '见备注' : '0'}ml</div>
                  <div className="text-[7pt]">尿量: {data.events.includes('尿量') ? '见备注' : '0'}ml</div>
                </div>
              </div>
              {/* Right: Chart Area */}
              <div className="flex-1 flex flex-col">
                <div className="h-8 border-b border-black flex items-center px-2">
                  {/* Time markers placeholder */}
                  <div className="flex justify-between w-full text-[7pt]">
                    <span>0</span><span>15</span><span>30</span><span>45</span><span>60</span><span>75</span><span>90</span>
                  </div>
                </div>
                <div className="flex-1 p-2 relative flex flex-col">
                  <div className="flex-1">
                    <VitalSignsChart data={data.vitals} onChange={() => {}} readOnly={true} />
                  </div>
                  {/* Legend for Chart */}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[7pt] border-t border-black pt-1">
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444]"></span> 心率 (HR)</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f97316]"></span> 血压 (BP)</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span> 血氧 (SpO2)</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981]"></span> 呼吸 (RR)</div>
                    <div className="flex items-center gap-1"><span>●</span> 诱导</div>
                    <div className="flex items-center gap-1"><span>○</span> 追加</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="mt-4 border border-black p-2 h-[30mm]">
              <div className="font-bold border-b border-black mb-1">备注/不良事件:</div>
              <div className="text-[8pt]">
                {data.events.length > 0 && `事件: ${data.events.join(', ')}. `}
                {data.eventDesc && `描述: ${data.eventDesc}. `}
                {data.eventAction.length > 0 && `处理: ${data.eventAction.join(', ')}. `}
                {data.eventOutcome && `转归: ${data.eventOutcome}. `}
                {data.specialEvents}
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="mt-4 grid grid-cols-5 gap-2 text-[8pt]">
              <div className="flex flex-col border p-1">
                <span className="font-bold">手术医师:</span>
                <span>{data.surgeons}</span>
                {data.operatorSign && <img src={data.operatorSign} className="h-6 object-contain self-center" alt="sign" />}
              </div>
              <div className="flex flex-col border p-1">
                <span className="font-bold">麻醉医师:</span>
                <span>{data.anesthetists}</span>
                {data.anesthetistSign && <img src={data.anesthetistSign} className="h-6 object-contain self-center" alt="sign" />}
              </div>
              <div className="flex flex-col border p-1">
                <span className="font-bold">麻醉护士:</span>
                <span>{data.anesthesiaNurse}</span>
                {data.nurseSign && <img src={data.nurseSign} className="h-6 object-contain self-center" alt="sign" />}
              </div>
              <div className="flex flex-col border p-1">
                <span className="font-bold">巡回护士:</span>
                <span>{data.circulatingNurse}</span>
              </div>
              <div className="flex flex-col border p-1">
                <span className="font-bold">器械护士:</span>
                <span>{data.instrumentNurse}</span>
              </div>
            </div>
          </div>

          {/* Page 2: Supplemental Details */}
          <div className="print-page w-[210mm] h-[297mm] p-[15mm] bg-white text-[9pt] leading-tight font-serif relative overflow-hidden mt-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">麻醉记录 (续页)</h2>
              <div className="flex justify-end text-[8pt] mt-1">第 2 页</div>
            </div>

            <div className="space-y-6">
              {/* Anesthesia Method Details */}
              <div className="border border-black">
                <div className="bg-slate-100 p-1 font-bold border-b border-black">麻醉方法详情</div>
                <div className="p-2 grid grid-cols-2 gap-4">
                  <div>
                    <div className="font-bold underline mb-1">全身麻醉</div>
                    <div className="space-y-1 text-[8pt]">
                      <div>诱导方式: 静脉诱导</div>
                      <div>气管插管: {data.ventilation}</div>
                      <div>维持方式: {data.anesthesiaMethod}</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold underline mb-1">监测与通路</div>
                    <div className="space-y-1 text-[8pt]">
                      <div>通气模式: {data.ventilation}</div>
                      <div>FiO₂: {data.fio2}%</div>
                      <div>氧流量: {data.oxygenFlow} L/min</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recovery & Discharge */}
              <div className="border border-black">
                <div className="bg-slate-100 p-1 font-bold border-b border-black">苏醒与离室评估</div>
                <div className="p-2 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div><span className="font-bold">离室时间:</span> {data.dischargeTime}</div>
                    <div><span className="font-bold">离室去向:</span> {data.destination} {data.destinationOther}</div>
                    <div><span className="font-bold">苏醒质量:</span> {data.recoveryQuality.join(', ')}</div>
                  </div>
                  
                  <div className="border p-2">
                    <div className="font-bold mb-1">Aldrete 评分 (总分: {data.aldrete.total})</div>
                    <div className="grid grid-cols-5 text-[8pt]">
                      <div>活动度: {data.aldrete.activity}</div>
                      <div>呼吸: {data.aldrete.resp}</div>
                      <div>循环: {data.aldrete.circ}</div>
                      <div>神志: {data.aldrete.cons}</div>
                      <div>SpO₂: {data.aldrete.spo2}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="font-bold">恶心呕吐(PONV):</span> {data.ponv}</div>
                    <div><span className="font-bold">疼痛评分(NRS):</span> {data.nrs}</div>
                  </div>

                  <div>
                    <span className="font-bold">离室医嘱:</span>
                    <div className="text-[8pt] mt-1">{data.dischargeOrders.join(', ')} {data.dischargeOrdersOther}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dotted">
                    <div><span className="font-bold">交接医师:</span> {data.handoverAnesthetist}</div>
                    <div><span className="font-bold">接收人员:</span> {data.handoverReceiver}</div>
                  </div>
                </div>
              </div>

              {/* Quality Control Summary */}
              <div className="border border-black">
                <div className="bg-slate-100 p-1 font-bold border-b border-black">质控统计摘要</div>
                <div className="p-2 grid grid-cols-2 gap-x-8 gap-y-2 text-[8pt]">
                  <div className="flex justify-between">
                    <span>低氧血症 (SpO₂&lt;90%):</span>
                    <span className="font-bold">{data.vitals.some(v => parseInt(v.spo2) < 90) ? '发生' : '未发生'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>非计划气管插管:</span>
                    <span className="font-bold">{data.events.includes('非计划气管插管') ? '发生' : '未发生'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>苏醒延迟 (&gt;30min):</span>
                    <span className="font-bold">{parseInt(data.totalDuration) > 30 ? '发生' : '未发生'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>返流误吸:</span>
                    <span className="font-bold">{data.events.includes('返流误吸') ? '发生' : '未发生'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-[15mm] left-[15mm] right-[15mm] border-t border-black pt-2 flex justify-between text-[8pt]">
              <span>打印时间: {new Date().toLocaleString()}</span>
              <span>记录人签名: ____________________</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
