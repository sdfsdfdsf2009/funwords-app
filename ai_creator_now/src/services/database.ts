import { Project, Scene, GeneratedImage, GeneratedVideo, AudioTrack, Timeline } from '../types';

// In-memory database for development
// In production, this would be replaced with a proper database like PostgreSQL or MongoDB

class InMemoryDatabase {
  private projects: Map<string, Project> = new Map();
  private scenes: Map<string, Scene[]> = new Map(); // projectId -> scenes
  private timelines: Map<string, Timeline> = new Map(); // projectId -> timeline
  private images: Map<string, GeneratedImage[]> = new Map(); // sceneId -> images
  private videos: Map<string, GeneratedVideo> = new Map(); // sceneId -> video

  // Project operations
  async createProject(project: Project): Promise<Project> {
    this.projects.set(project.id, project);
    this.scenes.set(project.id, []);
    return project;
  }

  async getProject(projectId: string): Promise<Project | null> {
    return this.projects.get(projectId) || null;
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const updatedProject = { ...project, ...updates, updatedAt: new Date() };
    this.projects.set(projectId, updatedProject);
    return updatedProject;
  }

  async deleteProject(projectId: string): Promise<boolean> {
    const deleted = this.projects.delete(projectId);
    if (deleted) {
      this.scenes.delete(projectId);
      this.timelines.delete(projectId);
    }
    return deleted;
  }

  async listProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  // Scene operations
  async createScene(projectId: string, scene: Scene): Promise<Scene> {
    const scenes = this.scenes.get(projectId) || [];
    scenes.push(scene);
    this.scenes.set(projectId, scenes);
    return scene;
  }

  async getScenes(projectId: string): Promise<Scene[]> {
    return this.scenes.get(projectId) || [];
  }

  async updateScene(sceneId: string, updates: Partial<Scene>): Promise<Scene | null> {
    for (const [projectId, scenes] of this.scenes.entries()) {
      const sceneIndex = scenes.findIndex(s => s.id === sceneId);
      if (sceneIndex !== -1) {
        const updatedScene = { ...scenes[sceneIndex], ...updates, updatedAt: new Date() };
        scenes[sceneIndex] = updatedScene;
        this.scenes.set(projectId, scenes);
        return updatedScene;
      }
    }
    return null;
  }

  async deleteScene(sceneId: string): Promise<boolean> {
    for (const [projectId, scenes] of this.scenes.entries()) {
      const sceneIndex = scenes.findIndex(s => s.id === sceneId);
      if (sceneIndex !== -1) {
        scenes.splice(sceneIndex, 1);
        this.scenes.set(projectId, scenes);
        this.images.delete(sceneId);
        this.videos.delete(sceneId);
        return true;
      }
    }
    return false;
  }

  async reorderScenes(projectId: string, fromIndex: number, toIndex: number): Promise<Scene[]> {
    const scenes = this.scenes.get(projectId) || [];
    const [movedScene] = scenes.splice(fromIndex, 1);
    scenes.splice(toIndex, 0, movedScene);

    // Renumber scenes
    const renumberedScenes = scenes.map((scene, index) => ({
      ...scene,
      sceneNumber: index + 1,
      updatedAt: new Date()
    }));

    this.scenes.set(projectId, renumberedScenes);
    return renumberedScenes;
  }

  // Image operations
  async addImages(sceneId: string, images: GeneratedImage[]): Promise<void> {
    const existingImages = this.images.get(sceneId) || [];
    this.images.set(sceneId, [...existingImages, ...images]);
  }

  async getImages(sceneId: string): Promise<GeneratedImage[]> {
    return this.images.get(sceneId) || [];
  }

  async updateImage(sceneId: string, imageId: string, updates: Partial<GeneratedImage>): Promise<GeneratedImage | null> {
    const images = this.images.get(sceneId) || [];
    const imageIndex = images.findIndex(img => img.id === imageId);
    if (imageIndex !== -1) {
      const updatedImage = { ...images[imageIndex], ...updates };
      images[imageIndex] = updatedImage;
      this.images.set(sceneId, images);
      return updatedImage;
    }
    return null;
  }

  // Video operations
  async setVideo(sceneId: string, video: GeneratedVideo): Promise<void> {
    this.videos.set(sceneId, video);
  }

  async getVideo(sceneId: string): Promise<GeneratedVideo | null> {
    return this.videos.get(sceneId) || null;
  }

  async deleteVideo(sceneId: string): Promise<boolean> {
    return this.videos.delete(sceneId);
  }

  // Timeline operations
  async createTimeline(timeline: Timeline): Promise<Timeline> {
    this.timelines.set(timeline.projectId, timeline);
    return timeline;
  }

  async getTimeline(projectId: string): Promise<Timeline | null> {
    return this.timelines.get(projectId) || null;
  }

  async updateTimeline(projectId: string, updates: Partial<Timeline>): Promise<Timeline | null> {
    const timeline = this.timelines.get(projectId);
    if (!timeline) return null;

    const updatedTimeline = { ...timeline, ...updates };
    this.timelines.set(projectId, updatedTimeline);
    return updatedTimeline;
  }

  async deleteTimeline(projectId: string): Promise<boolean> {
    return this.timelines.delete(projectId);
  }

  // Search and filter operations
  async searchProjects(query: string): Promise<Project[]> {
    const projects = Array.from(this.projects.values());
    const lowerQuery = query.toLowerCase();

    return projects.filter(project =>
      project.name.toLowerCase().includes(lowerQuery) ||
      (project.description && project.description.toLowerCase().includes(lowerQuery))
    );
  }

  async getProjectsByDateRange(startDate: Date, endDate: Date): Promise<Project[]> {
    const projects = Array.from(this.projects.values());

    return projects.filter(project =>
      project.createdAt >= startDate && project.createdAt <= endDate
    );
  }

  // Statistics
  async getProjectStats(): Promise<{
    totalProjects: number;
    totalScenes: number;
    totalImages: number;
    totalVideos: number;
  }> {
    const totalProjects = this.projects.size;
    let totalScenes = 0;
    let totalImages = 0;
    let totalVideos = 0;

    for (const scenes of this.scenes.values()) {
      totalScenes += scenes.length;
    }

    for (const images of this.images.values()) {
      totalImages += images.length;
    }

    totalVideos = this.videos.size;

    return {
      totalProjects,
      totalScenes,
      totalImages,
      totalVideos
    };
  }

  // Cleanup operations
  async cleanupOldProjects(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let deletedCount = 0;
    for (const [projectId, project] of this.projects.entries()) {
      if (project.createdAt < cutoffDate) {
        this.deleteProject(projectId);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // Backup and restore
  async exportData(): Promise<string> {
    const data = {
      projects: Array.from(this.projects.entries()),
      scenes: Array.from(this.scenes.entries()),
      timelines: Array.from(this.timelines.entries()),
      images: Array.from(this.images.entries()),
      videos: Array.from(this.videos.entries()),
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(data, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);

      // Clear existing data
      this.projects.clear();
      this.scenes.clear();
      this.timelines.clear();
      this.images.clear();
      this.videos.clear();

      // Restore data
      if (data.projects) {
        data.projects.forEach(([id, project]: [string, Project]) => {
          this.projects.set(id, project);
        });
      }

      if (data.scenes) {
        data.scenes.forEach(([projectId, scenes]: [string, Scene[]]) => {
          this.scenes.set(projectId, scenes);
        });
      }

      if (data.timelines) {
        data.timelines.forEach(([projectId, timeline]: [string, Timeline]) => {
          this.timelines.set(projectId, timeline);
        });
      }

      if (data.images) {
        data.images.forEach(([sceneId, images]: [string, GeneratedImage[]]) => {
          this.images.set(sceneId, images);
        });
      }

      if (data.videos) {
        data.videos.forEach(([sceneId, video]: [string, GeneratedVideo]) => {
          this.videos.set(sceneId, video);
        });
      }
    } catch (error) {
      throw new Error(`Failed to import data: ${error}`);
    }
  }
}

// Export singleton instance
export const database = new InMemoryDatabase();

// Export type for dependency injection
export type Database = typeof database;