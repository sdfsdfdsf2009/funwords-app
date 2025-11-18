import { useDatabaseVideoPresetStore } from './databaseVideoPresetStore';

// 重新导出数据库版本的store作为兼容性适配器
export const useVideoPresetStore = useDatabaseVideoPresetStore;

// 为了向后兼容，也导出默认的store
export default useDatabaseVideoPresetStore;

// 重新导出类型，保持兼容性
export type { VideoPresetStore } from './databaseVideoPresetStore';