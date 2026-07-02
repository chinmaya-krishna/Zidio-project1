declare module '../store/authStore' {
  const useAuthStore: any;
  export default useAuthStore;
}

declare module '../store/authStore.js' {
  const useAuthStore: any;
  export default useAuthStore;
}

declare module '../services/meetingService' {
  export function getMeeting(...args: any[]): any;
  export function endMeeting(...args: any[]): any;
  const _default: any;
  export default _default;
}

declare module '../services/messageService' {
  export function getMeetingMessages(...args: any[]): any;
  export function sendMessage(...args: any[]): any;
  const _default: any;
  export default _default;
}

declare module '../services/taskService' {
  export function getMyTasks(...args: any[]): any;
  export function updateTaskStatus(...args: any[]): any;
  export function deleteTask(...args: any[]): any;
  const _default: any;
  export default _default;
}
