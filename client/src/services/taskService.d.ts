export interface Task {
  _id: string;
  title: string;
  description?: string;
  status?: 'todo' | 'inprogress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  [key: string]: any;
}

export declare const createTask: (data: any) => Promise<any>;
export declare const getMyTasks: () => Promise<{ tasks: Task[] }>;
export declare const updateTaskStatus: (id: string, status: string) => Promise<any>;
export declare const deleteTask: (id: string) => Promise<any>;

export {};
