import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { useState } from "react";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="p-4 border-b bg-white flex justify-between items-center">
        <h1 className="text-xl font-bold">Convex Starter</h1>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>

      <main className="flex-1 container mx-auto p-4 max-w-2xl">
        <Authenticated>
          <Dashboard />
        </Authenticated>
        
        <Unauthenticated>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-sm p-6 bg-white rounded-xl shadow-sm border">
              <h2 className="text-2xl font-bold text-center mb-6">Welcome</h2>
              <SignInForm />
            </div>
          </div>
        </Unauthenticated>
      </main>
      
      <Toaster position="top-center" />
    </div>
  );
}

function Dashboard() {
  const tasks = useQuery(api.tasks.get);
  const addTask = useMutation(api.tasks.add);
  const [text, setText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await addTask({ text });
    setText("");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Add a Task</h2>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-1 px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Add
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Tasks</h2>
        {tasks === undefined ? (
          <p className="text-slate-500">Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <p className="text-slate-500">No tasks yet.</p>
        ) : (
          <ul className="divide-y">
            {tasks.map((task) => (
              <li key={task._id} className="py-3 flex items-center justify-between">
                <span>{task.text}</span>
                {task.isCompleted && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Done</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
