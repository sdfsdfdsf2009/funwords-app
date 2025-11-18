import { Project, Scene, GeneratedVideo } from '../../types';
import {
  RemotionTimeline,
  RemotionVideoSegment,
  RemotionSettings,
  RemotionTransition,
  RemotionTextOverlay,
  RemotionVideoEffect,
  RemotionAudioTrack
} from '../../types';

/**
 * 数据迁移工具 - 将现有项目数据转换为Remotion兼容格式
 */
export class DataMigrationService {
  // 默认Remotion设置
  private static readonly defaultSettings: RemotionSettings = {
    fps: 30,
    width: 1920,
    height: 1080,
    backgroundColor: '#000000',
    quality: 85,
  };

  /**
   * 将项目转换为Remotion时间轴
   */
  static convertProjectToTimeline(
    project: Project,
    settings?: Partial<RemotionSettings>
  ): RemotionTimeline {
    const remotionSettings = { ...this.defaultSettings, ...settings };
    const segments: RemotionVideoSegment[] = [];
    let currentTime = 0;

    // 按场景顺序和时间创建视频片段
    project.scenes.forEach((scene, sceneIndex) => {
      // 处理场景中的多个视频
      scene.generatedVideos.forEach((video, videoIndex) => {
        const segment = this.createVideoSegment(
          video,
          currentTime,
          sceneIndex,
          videoIndex
        );
        segments.push(segment);
        currentTime += video.metadata.duration;
      });

      // 如果场景没有视频但需要占位
      if (scene.generatedVideos.length === 0 && scene.images.length > 0) {
        // 创建占位片段
        const placeholderSegment = this.createPlaceholderSegment(
          scene,
          currentTime,
          sceneIndex
        );
        segments.push(placeholderSegment);
        currentTime += placeholderSegment.duration;
      }
    });

    // 添加默认转场
    const transitions = this.createDefaultTransitions(segments);

    return {
      id: `timeline-${project.id}`,
      name: `${project.name} - Remotion Timeline`,
      duration: currentTime,
      fps: remotionSettings.fps,
      width: remotionSettings.width,
      height: remotionSettings.height,
      backgroundColor: remotionSettings.backgroundColor,
      segments,
      transitions,
      audioTracks: [],
      textOverlays: [],
      effects: [],
      metadata: {
        createdAt: project.createdAt,
        updatedAt: new Date(),
        version: '2.0.0',
        description: `Migrated from original project: ${project.description || ''}`,
        tags: ['migrated', 'remotion'],
        originalProjectId: project.id,
      },
    };
  }

  /**
   * 创建视频片段
   */
  private static createVideoSegment(
    video: GeneratedVideo,
    startTime: number,
    sceneIndex: number,
    videoIndex: number
  ): RemotionVideoSegment {
    return {
      id: `segment-scene${sceneIndex}-video${videoIndex}-${video.id}`,
      videoSrc: video.url,
      thumbnailSrc: video.thumbnailUrl,
      startTime,
      duration: video.metadata.duration,
      trimStart: 0,
      trimEnd: video.metadata.duration,
      position: {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
      },
      opacity: 1,
      scale: 1,
      rotation: 0,
      effects: this.detectVideoEffects(video),
    };
  }

  /**
   * 创建占位片段
   */
  private static createPlaceholderSegment(
    scene: Scene,
    startTime: number,
    sceneIndex: number
  ): RemotionVideoSegment {
    const defaultDuration = 5; // 5秒占位

    return {
      id: `placeholder-scene${sceneIndex}-${scene.id}`,
      videoSrc: '',
      startTime,
      duration: defaultDuration,
      trimStart: 0,
      trimEnd: defaultDuration,
      position: {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
      },
      opacity: 0.5,
      scale: 1,
      rotation: 0,
      effects: [],
    };
  }

  /**
   * 检测并应用视频效果
   */
  private static detectVideoEffects(video: GeneratedVideo): RemotionVideoEffect[] {
    const effects: RemotionVideoEffect[] = [];

    // 基于视频元数据推断效果
    if (video.settings.style === 'cinematic') {
      effects.push({
        id: `effect-cinematic-${video.id}`,
        type: 'contrast',
        intensity: 0.2,
        properties: { style: 'cinematic' },
      });
      effects.push({
        id: `effect-cinematic-sat-${video.id}`,
        type: 'saturation',
        intensity: 0.1,
        properties: { style: 'cinematic' },
      });
    }

    if (video.settings.motionIntensity === 'high') {
      effects.push({
        id: `effect-motion-${video.id}`,
        type: 'blur',
        intensity: 0.3,
        properties: { motionCompensation: true },
      });
    }

    return effects;
  }

  /**
   * 创建默认转场
   */
  private static createDefaultTransitions(
    segments: RemotionVideoSegment[]
  ): RemotionTransition[] {
    const transitions: RemotionTransition[] = [];

    for (let i = 0; i < segments.length - 1; i++) {
      const currentSegment = segments[i];
      const nextSegment = segments[i + 1];

      // 在片段之间添加交叉淡化转场
      const transition: RemotionTransition = {
        id: `transition-${currentSegment.id}-${nextSegment.id}`,
        type: 'crossfade',
        duration: 0.5, // 0.5秒转场
        position: currentSegment.startTime + currentSegment.duration - 0.5,
        direction: 'left',
        intensity: 0.7,
        properties: {
          smooth: true,
          easing: 'ease-in-out',
        },
      };

      transitions.push(transition);
    }

    return transitions;
  }

  /**
   * 批量迁移多个项目
   */
  static async migrateProjects(
    projects: Project[],
    onProgress?: (current: number, total: number, project: Project) => void
  ): Promise<{ timelines: RemotionTimeline[], errors: string[] }> {
    const timelines: RemotionTimeline[] = [];
    const errors: string[] = [];

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];

      try {
        const timeline = this.convertProjectToTimeline(project);
        timelines.push(timeline);

        if (onProgress) {
          onProgress(i + 1, projects.length, project);
        }

        console.log(`✅ Migrated project: ${project.name}`);
      } catch (error) {
        const errorMessage = `Failed to migrate project ${project.name}: ${error}`;
        errors.push(errorMessage);
        console.error(`❌ ${errorMessage}`);
      }
    }

    return { timelines, errors };
  }

  /**
   * 验证迁移结果
   */
  static validateMigration(
    originalProject: Project,
    timeline: RemotionTimeline
  ): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // 检查基本属性
    if (!timeline.id || !timeline.name) {
      issues.push('Timeline missing basic properties (id, name)');
    }

    // 检查视频片段完整性
    const totalOriginalVideos = originalProject.scenes.reduce(
      (total, scene) => total + scene.generatedVideos.length,
      0
    );

    if (timeline.segments.length !== totalOriginalVideos) {
      issues.push(
        `Video count mismatch: original ${totalOriginalVideos}, timeline ${timeline.segments.length}`
      );
    }

    // 检查时间连续性
    let expectedTime = 0;
    for (const segment of timeline.segments) {
      if (Math.abs(segment.startTime - expectedTime) > 0.1) {
        issues.push(
          `Time continuity issue at segment ${segment.id}: expected ${expectedTime}, found ${segment.startTime}`
        );
      }
      expectedTime = segment.startTime + segment.duration;
    }

    // 检查视频URL有效性
    for (const segment of timeline.segments) {
      if (!segment.videoSrc && segment.id.startsWith('segment-')) {
        issues.push(`Missing video URL for segment ${segment.id}`);
      }
    }

    // 检查分辨率和帧率
    if (timeline.width <= 0 || timeline.height <= 0) {
      issues.push('Invalid timeline dimensions');
    }

    if (timeline.fps <= 0) {
      issues.push('Invalid frame rate');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * 创建迁移报告
   */
  static generateMigrationReport(
    projects: Project[],
    results: { timelines: RemotionTimeline[], errors: string[] }
  ): string {
    const timestamp = new Date().toLocaleString('zh-CN');
    const successCount = results.timelines.length;
    const errorCount = results.errors.length;

    let report = `# Remotion 数据迁移报告\n\n`;
    report += `生成时间: ${timestamp}\n`;
    report += `总项目数: ${projects.length}\n`;
    report += `成功迁移: ${successCount}\n`;
    report += `失败数量: ${errorCount}\n\n`;

    // 成功项目列表
    if (successCount > 0) {
      report += `## 成功迁移的项目\n\n`;
      results.timelines.forEach((timeline, index) => {
        const originalProject = projects[index];
        report += `- **${originalProject.name}** (ID: ${originalProject.id})\n`;
        report += `  - 时间轴ID: ${timeline.id}\n`;
        report += `  - 视频片段数: ${timeline.segments.length}\n`;
        report += `  - 总时长: ${timeline.duration.toFixed(2)}秒\n`;
        report += `  - 分辨率: ${timeline.width}×${timeline.height}\n\n`;
      });
    }

    // 错误列表
    if (errorCount > 0) {
      report += `## 迁移失败的项目\n\n`;
      results.errors.forEach((error) => {
        report += `- ❌ ${error}\n`;
      });
    }

    // 统计信息
    const totalVideos = results.timelines.reduce(
      (total, timeline) => total + timeline.segments.length,
      0
    );
    const totalDuration = results.timelines.reduce(
      (total, timeline) => total + timeline.duration,
      0
    );

    report += `\n## 统计信息\n\n`;
    report += `- 总视频片段数: ${totalVideos}\n`;
    report += `- 总视频时长: ${totalDuration.toFixed(2)}秒\n`;
    report += `- 平均片段时长: ${totalVideos > 0 ? (totalDuration / totalVideos).toFixed(2) : 0}秒\n`;

    return report;
  }

  /**
   * 将Remotion时间轴转换回项目格式（用于兼容性）
   */
  static convertTimelineToProject(
    timeline: RemotionTimeline,
    originalProject?: Project
  ): Project {
    const projectId = originalProject?.id || timeline.id.replace('timeline-', '');
    const projectName = originalProject?.name || timeline.name.replace(' - Remotion Timeline', '');

    // 从时间轴片段重构场景（简化实现）
    const scenes: Scene[] = [];
    let sceneNumber = 1;

    // 按时间分组片段为场景
    const sceneGroups: RemotionVideoSegment[][] = [];
    let currentGroup: RemotionVideoSegment[] = [];

    for (const segment of timeline.segments) {
      // 如果当前组为空或者片段间隔大于2秒，创建新场景
      if (currentGroup.length === 0 ||
          (currentGroup.length > 0 &&
           segment.startTime - (currentGroup[0].startTime + currentGroup[0].duration) > 2)) {
        if (currentGroup.length > 0) {
          sceneGroups.push([...currentGroup]);
        }
        currentGroup = [segment];
      } else {
        currentGroup.push(segment);
      }
    }

    if (currentGroup.length > 0) {
      sceneGroups.push(currentGroup);
    }

    // 为每个场景组创建Scene对象
    sceneGroups.forEach((group, index) => {
      const generatedVideos: GeneratedVideo[] = group
        .filter(segment => segment.videoSrc) // 过滤掉占位片段
        .map((segment, videoIndex) => ({
          id: segment.id.split('-').pop() || `video-${index}-${videoIndex}`,
          url: segment.videoSrc,
          thumbnailUrl: segment.thumbnailSrc || '',
          provider: 'migrated',
          sourceImageId: '',
          prompt: `Scene ${sceneNumber} - Video ${videoIndex + 1}`,
          settings: {
            duration: segment.duration,
            fps: timeline.fps,
            quality: 'high' as const,
            motionIntensity: 'medium' as const,
            motionStrength: 'medium' as const,
            style: 'realistic' as const,
            aspectRatio: '16:9' as const,
            promptEnhancement: true,
          },
          metadata: {
            fileSize: 0,
            format: 'mp4',
            duration: segment.duration,
            dimensions: { width: timeline.width, height: timeline.height },
            fps: timeline.fps,
            generationTime: 0,
          },
          createdAt: timeline.metadata.createdAt,
        }));

      scenes.push({
        id: `scene-${index}`,
        sceneNumber,
        imagePrompt: `Scene ${sceneNumber}`,
        videoPrompt: `Scene ${sceneNumber} video content`,
        generatedVideos,
        images: [],
        createdAt: timeline.metadata.createdAt,
        updatedAt: timeline.metadata.updatedAt,
      });

      sceneNumber++;
    });

    return {
      id: projectId,
      name: projectName,
      description: timeline.metadata.description,
      createdAt: timeline.metadata.createdAt,
      updatedAt: timeline.metadata.updatedAt,
      scenes,
      settings: originalProject?.settings || {
        defaultImageSettings: {
          width: timeline.width,
          height: timeline.height,
          quality: 'high',
          numberOfImages: 1,
        },
        defaultVideoSettings: {
          duration: 5,
          fps: timeline.fps,
          quality: 'high',
          motionIntensity: 'medium',
          motionStrength: 'medium',
          style: 'realistic',
          aspectRatio: '16:9',
          promptEnhancement: true,
        },
        exportSettings: {
          format: 'mp4',
          resolution: { width: timeline.width, height: timeline.height },
          quality: 'high',
          audioBitrate: 128000,
          videoBitrate: 5000000,
        },
      },
    };
  }
}

export default DataMigrationService;