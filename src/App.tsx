/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Settings, 
  Shuffle, 
  Plus, 
  Trash2, 
  Layout, 
  Download, 
  RotateCcw,
  Sparkles,
  X,
  UserPlus,
  Lock,
  UserX
} from 'lucide-react';

// --- Types ---
interface Student {
  id: string;
  name: string;
}

interface SeatAssignment {
  seatIndex: number;
  studentId: string | null;
  isBlocked?: boolean;
}

interface Restriction {
  id: string;
  ids: [string, string];
}

// --- Constants ---
const STORAGE_KEY = 'class-seats-students';
const LAYOUT_KEY = 'class-seats-layout';
const RESTRICTION_KEY = 'class-seats-restrictions';
const BLOCKED_KEY = 'class-seats-blocked';

export default function App() {
  // --- State ---
  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(6);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [assignments, setAssignments] = useState<SeatAssignment[]>([]);
  const [newName, setNewName] = useState('');
  const [isShuffling, setIsShuffling] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [numRange, setNumRange] = useState({ start: 1, end: 25, exclude: '' });
  const [blockedIndices, setBlockedIndices] = useState<number[]>([]);
  const [restrictS1, setRestrictS1] = useState('');
  const [restrictS2, setRestrictS2] = useState('');
  const [shuffleMsgIndex, setShuffleMsgIndex] = useState(0);

  const SHUFFLE_MESSAGES = [
    "누가 옆에 앉을까? 두근두근...",
    "마법처럼 자리를 섞고 있어요!",
    "새로운 짝꿍을 기대해봐요!",
    "오늘의 행운의 자리는 어디?",
    "선생님의 마법 지팡이 휘두르기!"
  ];

  // --- Initialization ---
  useEffect(() => {
    if (isShuffling) {
      const interval = setInterval(() => {
        setShuffleMsgIndex(prev => (prev + 1) % SHUFFLE_MESSAGES.length);
      }, 1000); // 1초 마다 메시지 변경
      return () => clearInterval(interval);
    }
  }, [isShuffling]);
  useEffect(() => {
    const savedStudents = localStorage.getItem(STORAGE_KEY);
    const savedLayout = localStorage.getItem(LAYOUT_KEY);
    const savedRest = localStorage.getItem(RESTRICTION_KEY);
    const savedBlocked = localStorage.getItem(BLOCKED_KEY);

    if (savedStudents) {
      try { setStudents(JSON.parse(savedStudents)); } catch (e) { console.error(e); }
    }
    if (savedLayout) {
      try {
        const { r, c } = JSON.parse(savedLayout);
        setRows(r);
        setCols(c);
      } catch (e) { console.error(e); }
    }
    if (savedRest) {
      try { setRestrictions(JSON.parse(savedRest)); } catch (e) { console.error(e); }
    }
    if (savedBlocked) {
      try { setBlockedIndices(JSON.parse(savedBlocked)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({ r: rows, c: cols }));
  }, [rows, cols]);

  useEffect(() => {
    localStorage.setItem(RESTRICTION_KEY, JSON.stringify(restrictions));
  }, [restrictions]);

  useEffect(() => {
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(blockedIndices));
  }, [blockedIndices]);

  // Initial assignment: distribute students to first N available seats
  useEffect(() => {
    if (assignments.length === 0 && students.length > 0) {
      const initial: SeatAssignment[] = Array.from({ length: rows * cols }, (_, i) => ({
        seatIndex: i,
        studentId: null,
        isBlocked: blockedIndices.includes(i)
      }));

      const availableIndices = initial
        .filter(a => !a.isBlocked)
        .map(a => a.seatIndex);

      students.forEach((s, idx) => {
        if (availableIndices[idx] !== undefined) {
          initial[availableIndices[idx]].studentId = s.id;
        }
      });

      setAssignments(initial);
    }
  }, [students, rows, cols, assignments.length, blockedIndices]);

  // --- Logic Helpers ---
  const getStudentById = (id: string | null) => students.find(s => s.id === id);

  const isValidSeating = useCallback((newAssignments: SeatAssignment[]) => {
    // Check horizontally adjacent seats for forbidden pairs
    for (const res of restrictions) {
      const [id1, id2] = res.ids;
      const idx1 = newAssignments.findIndex(a => a.studentId === id1);
      const idx2 = newAssignments.findIndex(a => a.studentId === id2);

      if (idx1 !== -1 && idx2 !== -1) {
        const r1 = Math.floor(idx1 / cols);
        const c1 = idx1 % cols;
        const r2 = Math.floor(idx2 / cols);
        const c2 = idx2 % cols;

        // Same row and adjacent column
        if (r1 === r2 && Math.abs(c1 - c2) === 1) {
          return false;
        }
      }
    }
    return true;
  }, [restrictions, cols]);

  // --- Actions ---
  const addStudent = useCallback(() => {
    if (!newName.trim()) return;
    const student: Student = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName.trim(),
    };
    setStudents(prev => [...prev, student]);
    setNewName('');
  }, [newName]);

  const generateByNumber = useCallback(() => {
    const { start, end, exclude } = numRange;
    const excludeList = exclude.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    const newStudents: Student[] = [];
    
    for (let i = start; i <= end; i++) {
      if (!excludeList.includes(i)) {
        newStudents.push({
          id: `num-${i}-${Math.random().toString(36).substr(2, 4)}`,
          name: `${i}번`,
        });
      }
    }
    setStudents(newStudents);
  }, [numRange]);

  const removeStudent = useCallback((id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    setRestrictions(prev => prev.filter(r => !r.ids.includes(id)));
  }, []);

  const addRestriction = (s1: string, s2: string) => {
    if (!s1 || !s2 || s1 === s2) return;
    if (restrictions.some(r => r.ids.includes(s1) && r.ids.includes(s2))) return;
    
    setRestrictions(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      ids: [s1, s2]
    }]);
  };

  const removeRestriction = (id: string) => {
    setRestrictions(prev => prev.filter(r => r.id !== id));
  };

  const toggleBlock = (index: number) => {
    if (isShuffling) return;
    
    setBlockedIndices(prev => {
      const next = prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index];
      
      // Update current assignments immediately
      setAssignments(current => {
        const nextAssignments = [...current];
        if (nextAssignments[index]) {
          const wasBlocked = nextAssignments[index].isBlocked;
          nextAssignments[index] = {
            ...nextAssignments[index],
            isBlocked: !wasBlocked,
            studentId: !wasBlocked ? null : nextAssignments[index].studentId
          };
        }
        return nextAssignments;
      });
      
      return next;
    });
  };

  const handleShuffle = useCallback(() => {
    if (students.length === 0) return;
    
    setIsShuffling(true);
    
    setTimeout(() => {
      try {
        let finalAssignments: SeatAssignment[] = [];
        let attempts = 0;
        const MAX_ATTEMPTS = 500;

        while (attempts < MAX_ATTEMPTS) {
          // Create a random seating
          const studentPool = [...students].sort(() => Math.random() - 0.5);
          
          // Find indices that are NOT blocked
          const availableSeatIndices = Array.from({ length: rows * cols }, (_, i) => i)
            .filter(i => !blockedIndices.includes(i))
            .sort(() => Math.random() - 0.5);

          if (availableSeatIndices.length < students.length) {
            alert(`학생 수(${students.length}명)가 가용한 자리(${availableSeatIndices.length}개)보다 많습니다. 자리를 더 열어주세요.`);
            setIsShuffling(false);
            return;
          }

          const tempAssignments: SeatAssignment[] = Array.from({ length: rows * cols }, (_, i) => ({
            seatIndex: i,
            studentId: null,
            isBlocked: blockedIndices.includes(i)
          }));

          studentPool.forEach((student, i) => {
            const targetSeat = availableSeatIndices[i];
            if (targetSeat !== undefined) {
              tempAssignments[targetSeat].studentId = student.id;
            }
          });

          if (isValidSeating(tempAssignments)) {
            finalAssignments = tempAssignments;
            break;
          }
          attempts++;
        }

        if (finalAssignments.length === 0) {
          alert('모든 제한 조건을 만족하는 배치를 찾지 못했습니다. 학생을 다시 섞거나 제한을 줄여주세요.');
        } else {
          setAssignments(finalAssignments);
        }
      } catch (error) {
        console.error(error);
        alert('배치 중 오류가 발생했습니다.');
      } finally {
        setIsShuffling(false);
      }
    }, 2500); // 2.5초 동안 마법 부리기
  }, [students, rows, cols, restrictions, blockedIndices, isValidSeating]);

  const resetLayout = () => {
    setAssignments([]);
  };

  const currentAssignments = useMemo(() => {
    const totalSeats = rows * cols;
    const base = assignments.slice(0, totalSeats);
    const needed = totalSeats - base.length;
    
    if (needed > 0) {
      const extra = Array.from({ length: needed }, (_, i) => {
        const seatIdx = base.length + i;
        return {
          seatIndex: seatIdx,
          studentId: null,
          isBlocked: blockedIndices.includes(seatIdx)
        };
      });
      return [...base, ...extra];
    }
    return base;
  }, [assignments, rows, cols, blockedIndices]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {showConfig && (
          <motion.div 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-screen z-10"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
                <Sparkles className="w-6 h-6" />
                <span>선생님 도구</span>
              </div>
              <button 
                onClick={() => setShowConfig(false)}
                className="md:hidden p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Layout className="w-4 h-4" />
                  <h3>교실 배치</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">가로 (열)</label>
                    <input 
                      type="number" min="1" max="12" value={cols}
                      onChange={(e) => { setCols(Number(e.target.value)); resetLayout(); }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">세로 (행)</label>
                    <input 
                      type="number" min="1" max="12" value={rows}
                      onChange={(e) => { setRows(Number(e.target.value)); resetLayout(); }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <Users className="w-4 h-4" />
                    <h3>명단 ({students.length}명)</h3>
                  </div>
                  <button 
                    onClick={() => { if (confirm('모든 명단을 지울까요?')) setStudents([]); }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    초기화
                  </button>
                </div>
                
                <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold">시작</label>
                      <input 
                        type="number" value={numRange.start}
                        onChange={e => setNumRange(prev => ({ ...prev, start: parseInt(e.target.value) }))}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-sm" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold">끝</label>
                      <input 
                        type="number" value={numRange.end}
                        onChange={e => setNumRange(prev => ({ ...prev, end: parseInt(e.target.value) }))}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-sm" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold">결번 (쉼표로 구분)</label>
                    <input 
                      type="text" placeholder="예: 4, 15" value={numRange.exclude}
                      onChange={e => setNumRange(prev => ({ ...prev, exclude: e.target.value }))}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-sm" 
                    />
                  </div>
                  <button 
                    onClick={generateByNumber}
                    className="w-full py-2 bg-slate-200 hover:bg-indigo-100 hover:text-indigo-600 text-slate-600 rounded-lg text-xs font-bold transition-colors"
                  >
                    번호로 명단 생성
                  </button>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" placeholder="아이 이름" value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addStudent()}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <button onClick={addStudent} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-95 transition-all">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {students.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                      <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">명단을 등록해주세요</p>
                    </div>
                  ) : (
                    students.map(student => (
                      <div key={student.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                        <span className="text-sm font-medium text-slate-600">{student.name}</span>
                        <button onClick={() => removeStudent(student.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-slate-100 space-y-3">
               <button 
                onClick={handleShuffle}
                disabled={students.length === 0 || isShuffling}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 transform active:scale-95 transition-all text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
               >
                 <Shuffle className={`w-5 h-5 ${isShuffling ? 'animate-spin' : ''}`} />
                 <span>{isShuffling ? '섞는 중...' : '무작위로 섞기!'}</span>
               </button>
               
               <div className="flex items-center justify-between">
                 <button 
                  onClick={() => setShowSecret(true)}
                  className="p-1 text-slate-200 hover:text-indigo-400 transition-colors"
                  title="Secret Settings"
                 >
                   <Lock className="w-4 h-4" />
                 </button>
                 <span className="text-[10px] text-slate-200 font-mono tracking-tighter">SECURE_ALGO_V1</span>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Seat Area */}
      <main className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
        {/* Shuffle Overlay */}
        <AnimatePresence>
          {isShuffling && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-indigo-600/90 flex flex-col items-center justify-center text-white backdrop-blur-sm"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="mb-8"
              >
                <Sparkles className="w-24 h-24 text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.5)]" />
              </motion.div>
              <div className="h-12 overflow-hidden flex items-center justify-center">
                <motion.h2 
                  key={shuffleMsgIndex}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="text-2xl md:text-3xl font-bold font-hand tracking-widest text-center"
                >
                  {SHUFFLE_MESSAGES[shuffleMsgIndex]}
                </motion.h2>
              </div>
              <div className="mt-12 flex gap-3">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      y: [0, -15, 0],
                      backgroundColor: ['#fff', '#fcd34d', '#fff']
                    }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                    className="w-4 h-4 bg-white rounded-full shadow-lg"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showConfig && (
          <motion.button 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setShowConfig(true)}
            className="absolute top-6 left-6 p-3 bg-white shadow-md border border-slate-100 rounded-full text-slate-500 hover:text-indigo-600 z-20"
          >
            <Settings className="w-6 h-6" />
          </motion.button>
        )}

        <div className="w-full max-w-5xl flex flex-col items-center space-y-12">
          <div className="w-3/4 max-w-md h-12 bg-slate-800 rounded-full flex items-center justify-center text-white font-bold tracking-[0.5em] shadow-xl border-4 border-slate-700 ring-8 ring-slate-100">
            CHALKBOARD
          </div>

          <div 
            className="grid gap-3 md:gap-4 w-full"
            style={{ 
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              perspective: '1000px'
            }}
          >
            {currentAssignments.map((assignment, idx) => {
              const student = getStudentById(assignment.studentId);
              return (
                <motion.div
                  key={`seat-${idx}`}
                  layout
                  onClick={() => toggleBlock(idx)}
                  transition={{ 
                    layout: { duration: 0.6, type: "spring", stiffness: 180, damping: 25 },
                    opacity: { duration: 0.4 }
                  }}
                  className={`
                    aspect-[4/3] rounded-xl flex items-center justify-center text-center p-1 md:p-2 
                    transition-all duration-500 border-2 cursor-pointer relative overflow-hidden group
                    ${assignment.isBlocked 
                      ? 'bg-slate-100 border-slate-200' 
                      : student 
                        ? 'bg-white border-white shadow-sm ring-1 ring-slate-200 hover:shadow-md hover:ring-indigo-300' 
                        : 'bg-slate-200/50 border-dashed border-slate-300 hover:bg-slate-200 transition-colors'
                    }
                  `}
                >
                  {assignment.isBlocked && (
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000, #000 10px, transparent 10px, transparent 20px)' }} />
                  )}
                  <AnimatePresence mode="wait">
                    {assignment.isBlocked ? (
                      <motion.div 
                        key="blocked" 
                        initial={{ opacity: 0, scale: 0.5 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="flex flex-col items-center"
                      >
                        <X className="w-4 h-4 text-slate-300" />
                        <span className="text-[10px] text-slate-300 font-bold">사용 안 함</span>
                      </motion.div>
                    ) : student ? (
                      <motion.div
                        key={student.id}
                        initial={{ scale: 0.4, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.4, opacity: 0, y: -10 }}
                        className="w-full h-full flex flex-col items-center justify-center"
                      >
                         <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-50 text-indigo-500 mb-1 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                            <Users className="w-3 h-3 md:w-4 md:h-4" />
                         </div>
                         <span className="text-xs md:text-base font-bold text-slate-700 truncate w-full px-1">
                           {student.name}
                         </span>
                      </motion.div>
                    ) : (
                      <motion.span 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.4 }}
                        className="text-[10px] md:text-xs text-slate-400 font-medium"
                      >
                        빈 자리
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          <div className="flex gap-4">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-full text-slate-600 font-semibold hover:border-indigo-200 transition-all shadow-sm active:scale-95">
              <Download className="w-4 h-4" /> 배치도 인쇄
            </button>
            <button onClick={() => { if(confirm('배치를 초기화할까요?')) setAssignments([]); }} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-full text-slate-600 font-semibold hover:border-orange-200 transition-all shadow-sm active:scale-95">
              <RotateCcw className="w-4 h-4" /> 순서 초기화
            </button>
          </div>
        </div>
      </main>

      {/* Secret Modal */}
      <AnimatePresence>
        {showSecret && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSecret(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 bg-slate-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  <Lock className="w-5 h-5" />
                  <span>비밀 설정 (짝꿍 금지)</span>
                </div>
                <button onClick={() => setShowSecret(false)}><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">배치할 때 서로 가로로 앉지 않도록 할 학생 쌍을 선택해 주세요.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <select 
                      value={restrictS1}
                      onChange={(e) => setRestrictS1(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">학생 1 선택</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select 
                      value={restrictS2}
                      onChange={(e) => setRestrictS2(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">학생 2 선택</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <button 
                    onClick={() => {
                      addRestriction(restrictS1, restrictS2);
                      setRestrictS1('');
                      setRestrictS2('');
                    }}
                    disabled={!restrictS1 || !restrictS2 || restrictS1 === restrictS2}
                    className="w-full py-3 bg-indigo-600 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Plus className="w-5 h-5" /> 금지 등록
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {restrictions.map(res => (
                    <div key={res.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="text-slate-700 bg-white px-2 py-1 rounded shadow-sm">{getStudentById(res.ids[0])?.name}</span>
                        <UserX className="w-4 h-4 text-red-400" />
                        <span className="text-slate-700 bg-white px-2 py-1 rounded shadow-sm">{getStudentById(res.ids[1])?.name}</span>
                      </div>
                      <button onClick={() => removeRestriction(res.id)} className="text-slate-300 hover:text-red-500 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {restrictions.length === 0 && <p className="text-center py-4 text-xs text-slate-300">등록된 금지 쌍이 없습니다.</p>}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        @media print {
          .md\\:w-80, button, .z-20, .fixed { display: none !important; }
          main { padding: 0 !important; background: white !important; }
          .md\\:p-8 { padding: 2rem !important; }
        }
      `}</style>
    </div>
  );
}

