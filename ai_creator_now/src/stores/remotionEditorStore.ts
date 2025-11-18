import { useDatabaseRemotionEditorStore } from './databaseRemotionEditorStore';

// 重新导出数据库版本的store作为兼容性适配器
// 这确保了现有代码可以无缝迁移到数据库存储
export const useRemotionEditorStore = useDatabaseRemotionEditorStore;

// 为了向后兼容，也导出默认的store
export default useDatabaseRemotionEditorStore;