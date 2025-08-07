

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FC, FormEvent } from 'react';
import type { Task } from '../types';
import { MODULES } from '../constants';
import { getTaskSuggestions } from '../services/geminiService';
import { PlusIcon, SparkleIcon, TrashIcon } from './icons';

// --- Calendar Component ---
interface CalendarProps {
    tasks: Task[];
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
}

const Calendar: FC<CalendarProps> = ({ tasks, selectedDate, onDateSelect }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    const tasksByDate = useMemo(() => {
        const map = new Map<string, boolean>();
        tasks.forEach(task => {
            if (task.dueDate) {
                map.set(task.dueDate, true);
            }
        });
        return map;
    }, [tasks]);

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(year, month + offset, 1));
    };

    const handleDayClick = (day: number) => {
        onDateSelect(new Date(year, month, day));
    };

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-slate-200 shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="text-slate-500 hover:text-indigo-600 p-2 rounded-full">&lt;</button>
                <h3 className="text-base sm:text-lg font-semibold text-slate-800">{currentDate.toLocaleString('default', { month: 'long' })} {year}</h3>
                <button onClick={() => changeMonth(1)} className="text-slate-500 hover:text-indigo-600 p-2 rounded-full">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {weekdays.map((day, index) => <div key={`${day}-${index}`} className="font-bold text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">{day}</div>)}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {Array.from({ length: daysInMonth }).map((_, day) => {
                    const dayNumber = day + 1;
                    const date = new Date(year, month, dayNumber);
                    const dateString = date.toISOString().split('T')[0];
                    const isToday = new Date().toDateString() === date.toDateString();
                    const isSelected = selectedDate.toDateString() === date.toDateString();
                    const hasTasks = tasksByDate.has(dateString);

                    return (
                        <div key={day} className="py-1 flex justify-center">
                            <button
                                onClick={() => handleDayClick(dayNumber)}
                                className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-xs sm:text-sm relative transition-colors duration-200
                                    ${isSelected ? 'bg-indigo-600 text-white shadow-md' : ''}
                                    ${!isSelected && isToday ? 'bg-indigo-200 text-indigo-700' : ''}
                                    ${!isSelected && !isToday ? 'text-slate-700 hover:bg-slate-200' : ''}
                                `}
                            >
                                {dayNumber}
                                {hasTasks && <span className={`absolute bottom-1 sm:bottom-1.5 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}></span>}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


// --- CoreFlow Component ---
const CoreFlow: FC = () => {
    const moduleInfo = MODULES.CoreFlow;
    const [tasks, setTasks] = useState<Task[]>(() => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 2);
        
        const defaultTasks = [
            { id: '1', text: 'Design the Mirai hub screen', completed: true, dueDate: '2024-07-20' },
            { id: '2', text: 'Implement CoreFlow calendar', completed: false, dueDate: today.toISOString().split('T')[0] },
            { id: '3', text: 'Prepare for weekly sync', completed: false, dueDate: tomorrow.toISOString().split('T')[0] },
        ];
        
        try {
            const savedTasks = localStorage.getItem('coreflow-tasks');
            return savedTasks ? JSON.parse(savedTasks) : defaultTasks;
        } catch (error) {
            console.error("Failed to parse tasks from localStorage:", error);
            localStorage.removeItem('coreflow-tasks');
            return defaultTasks;
        }
    });

    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [suggestions, setSuggestions] = useState('');
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        localStorage.setItem('coreflow-tasks', JSON.stringify(tasks));
    }, [tasks]);

    const handleAddTask = (e: FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;
        const newTask: Task = {
            id: Date.now().toString(),
            text: newTaskText.trim(),
            completed: false,
            dueDate: newTaskDueDate || undefined,
        };
        setTasks([newTask, ...tasks]);
        setNewTaskText('');
        setNewTaskDueDate('');
    };

    const toggleTask = (id: string) => {
        setTasks(
            tasks.map(task =>
                task.id === id ? { ...task, completed: !task.completed } : task
            )
        );
    };

    const deleteTask = (id: string) => {
        setTasks(tasks.filter(task => task.id !== id));
    };

    const fetchSuggestions = useCallback(async () => {
        setIsLoadingSuggestions(true);
        const result = await getTaskSuggestions(tasks.filter(t => !t.completed));
        setSuggestions(result);
        setIsLoadingSuggestions(false);
    }, [tasks]);
    
    const upcomingTasks = useMemo(() => {
        return tasks
            .filter(t => !t.completed && t.dueDate)
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    }, [tasks]);

    return (
        <div className="flex-1 flex flex-col h-full text-slate-800 p-4 sm:p-6 md:p-8 overflow-y-auto bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-100">
            <header className="mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <moduleInfo.Icon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{moduleInfo.name}</h1>
                        <p className="text-slate-500">{moduleInfo.description}</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left Column: Calendar and AI Suggestions */}
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <Calendar tasks={tasks} selectedDate={selectedDate} onDateSelect={setSelectedDate} />
                    
                     <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-slate-200 shadow-lg">
                        <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center gap-2">
                           <SparkleIcon className="w-5 h-5 text-amber-500"/> AI Productivity Tips
                        </h2>
                        <div className="min-h-[6rem] p-4 bg-indigo-50/50 rounded-lg text-slate-700 leading-relaxed">
                            {isLoadingSuggestions ? 'Thinking...' : suggestions || 'Click "Get Suggestions" for AI-powered task prioritization.'}
                        </div>
                        <button onClick={fetchSuggestions} disabled={isLoadingSuggestions} className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                            {isLoadingSuggestions ? 'Analyzing...' : 'Get Suggestions'}
                        </button>
                    </div>
                </div>
                
                {/* Right Column: Add Task and Upcoming Deadlines */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                     <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-slate-200 shadow-lg">
                        <h2 className="text-xl font-semibold text-slate-700 mb-4">Add New Task</h2>
                        <form onSubmit={handleAddTask} className="flex flex-col gap-3">
                            <input
                                type="text"
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                placeholder="What needs to be done?"
                                className="w-full bg-white border border-slate-300 rounded-md px-4 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                             <input
                                type="date"
                                value={newTaskDueDate}
                                onChange={(e) => setNewTaskDueDate(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-md px-4 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2">
                                <PlusIcon className="w-5 h-5"/> Add Task
                            </button>
                        </form>
                    </div>

                    <div className="flex-1 bg-white/80 backdrop-blur-md rounded-xl p-6 border border-slate-200 shadow-lg flex flex-col overflow-hidden">
                        <h2 className="text-xl font-semibold text-slate-700 mb-4">Upcoming Deadlines</h2>
                        <div className="flex-1 space-y-3 overflow-y-auto -mr-2 pr-2">
                            {upcomingTasks.length > 0 ? upcomingTasks.map(task => (
                                <div key={task.id} className="flex items-center gap-3 p-3 bg-slate-100/70 rounded-lg">
                                    <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={() => toggleTask(task.id)}
                                        className="h-5 w-5 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <div className="flex-1">
                                        <p className={`text-slate-800 ${task.completed ? 'line-through text-slate-500' : ''}`}>{task.text}</p>
                                        {task.dueDate && <p className="text-xs text-indigo-600 font-medium">{new Date(new Date(task.dueDate).getTime() + (new Date().getTimezoneOffset() * 60000)).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>}
                                    </div>
                                    <button onClick={() => deleteTask(task.id)} className="text-slate-400 hover:text-red-600 p-1 rounded-full transition-colors">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            )) : (
                                <p className="text-slate-500 text-center py-8">No upcoming deadlines. Clear skies!</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoreFlow;