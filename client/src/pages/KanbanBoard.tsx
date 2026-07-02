import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getMyTasks, updateTaskStatus, deleteTask } from '../services/taskService';
import type { Task } from '../services/taskService';

const KanbanBoard = () => {
  const navigate = useNavigate();

  const { data, refetch } = useQuery<{ tasks: Task[] }>({
    queryKey: ['tasks'],
    queryFn: getMyTasks,
  });

  const tasks = data?.tasks || [];
  const todoTasks = tasks.filter((t: Task) => t.status === 'todo');
  const inProgressTasks = tasks.filter((t: Task) => t.status === 'inprogress');
  const completedTasks = tasks.filter((t: Task) => t.status === 'completed');

  const handleStatusChange = async (id: string, status: string) => {
    await updateTaskStatus(id, status);
    refetch();
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    refetch();
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <div className="bg-gray-700 p-4 rounded-lg mb-3">
      <h3 className="font-semibold mb-1">{task.title}</h3>
      <p className="text-gray-400 text-sm mb-2">{task.description}</p>
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-1 rounded-full ${
          task.priority === 'high' ? 'bg-red-600' :
          task.priority === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
        }`}>
          {task.priority}
        </span>
        <div className="flex gap-2">
          {task.status !== 'todo' && (
            <button
              onClick={() => handleStatusChange(task._id,
                task.status === 'inprogress' ? 'todo' : 'inprogress'
              )}
              className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded transition"
            >
              ←
            </button>
          )}
          {task.status !== 'completed' && (
            <button
              onClick={() => handleStatusChange(task._id,
                task.status === 'todo' ? 'inprogress' : 'completed'
              )}
              className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded transition"
            >
              →
            </button>
          )}
          <button
            onClick={() => handleDelete(task._id)}
            className="text-xs bg-red-600 hover:bg-red-500 px-2 py-1 rounded transition"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">🤖 IntellMeet — Kanban Board</h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 p-4 rounded-xl">
            <h2 className="font-semibold mb-4 text-red-400">
              📋 Todo ({todoTasks.length})
            </h2>
            {todoTasks.map((task: any) => (
              <TaskCard key={task._id} task={task} />
            ))}
          </div>

          <div className="bg-gray-800 p-4 rounded-xl">
            <h2 className="font-semibold mb-4 text-yellow-400">
              ⚡ In Progress ({inProgressTasks.length})
            </h2>
            {inProgressTasks.map((task: any) => (
              <TaskCard key={task._id} task={task} />
            ))}
          </div>

          <div className="bg-gray-800 p-4 rounded-xl">
            <h2 className="font-semibold mb-4 text-green-400">
              ✅ Completed ({completedTasks.length})
            </h2>
            {completedTasks.map((task: any) => (
              <TaskCard key={task._id} task={task} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KanbanBoard;