// Core data types for video generation workstation

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  scenes: Scene[];
  settings: ProjectSettings;
}

export interface Scene {
  id: string;
  sceneNumber: number;
  title: string;
  description?: string; // Add description field for fallback
  imagePrompt: string;
  videoPrompt: string;
  selectedImage?: GeneratedImage;
  generatedVideo?: GeneratedVideo; // Keep for backward compatibility
  generatedVideos: GeneratedVideo[]; // New array for multiple videos
  images: GeneratedImage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  provider: string;
  prompt: string;
  settings: ImageGenerationSettings;
  metadata: ImageMetadata;
  createdAt: Date;
}

export interface GeneratedVideo {
  id: string;
  url: string;
  thumbnailUrl: string;
  provider: string;
  sourceImageId: string;
  prompt: string;
  settings: VideoGenerationSettings;
  metadata: VideoMetadata;
  createdAt: Date;
}

export interface ProjectSettings {
  preferredImageProvider?: string;
  preferredVideoProvider?: string;
  defaultImageSettings: ImageGenerationSettings;
  defaultVideoSettings: VideoGenerationSettings;
  exportSettings: ExportSettings;
}

export interface ImageGenerationSettings {
  width: number;
  height: number;
  quality: 'standard' | 'high';
  style?: string;
  numberOfImages: number;
}

export interface VideoGenerationSettings {
  duration: number; // seconds
  fps: number;
  quality: 'standard' | 'high' | 'ultra';
  motionIntensity: 'low' | 'medium' | 'high';
  motionStrength: 'subtle' | 'medium' | 'strong';
  style: 'realistic' | 'cinematic' | 'artistic' | 'animated';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  promptEnhancement: boolean;
}

export interface VideoGenerationPreset {
  id: string;
  name: string;
  description?: string;
  settings: VideoGenerationSettings;
  createdAt: Date;
  isDefault?: boolean;
}

export interface ImageMetadata {
  fileSize: number;
  format: string;
  dimensions: { width: number; height: number };
  generationTime: number;
  cost?: number;
  sceneId?: string; // Reference to the scene this image belongs to
}

export interface VideoMetadata {
  fileSize: number;
  format: string;
  duration: number;
  dimensions: { width: number; height: number };
  fps: number;
  generationTime: number;
  cost?: number;
}

export interface ExportSettings {
  format: 'mp4' | 'mov' | 'webm';
  resolution: { width: number; height: number };
  quality: 'low' | 'medium' | 'high';
  audioBitrate: number;
  videoBitrate: number;
}

export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  waveformUrl?: string;
  duration: number;
  format: string;
  metadata: AudioMetadata;
  volume: number; // 0-1
  muted: boolean;
  position: number; // Timeline position in seconds
  trimStart: number;
  trimEnd: number;
}

export interface AudioMetadata {
  fileSize: number;
  format: string;
  duration: number;
  bitrate: number;
  sampleRate: number;
}

export interface Timeline {
  id: string;
  projectId: string;
  videoSegments: VideoSegment[];
  audioTracks: AudioTrack[];
  transitions: Transition[];
  duration: number;
}

export interface VideoSegment {
  id: string;
  videoId: string;
  position: number; // Timeline position in seconds
  trimStart: number;
  trimEnd: number;
  transitionIn?: Transition;
  transitionOut?: Transition;
}

export interface Transition {
  id: string;
  type: 'cut' | 'fade' | 'crossfade' | 'slide' | 'zoom' | 'dissolve';
  duration: number; // seconds
  position: number; // Timeline position in seconds
  direction?: 'left' | 'right' | 'up' | 'down';
  intensity?: number; // 0-1
}

// AI Provider types
export interface AIProvider {
  id: string;
  name: string;
  type: 'image' | 'video' | 'both';
  capabilities: string[];
  settings: ProviderSettings;
}

export interface ProviderSettings {
  apiKey?: string;
  endpoint?: string;
  rateLimit?: number;
  costs?: {
    image?: number;
    video?: number;
  };
}

// CSV Import types
export interface CSVSceneData {
  sceneNumber: number;
  imagePrompt: string;
  videoPrompt: string;
}

export interface CSVImportResult {
  scenes: CSVSceneData[];
  errors: CSVImportError[];
  warnings: CSVImportWarning[];
  fieldMapping?: FieldMapping;
}

export interface CSVImportError {
  row: number;
  field: string;
  message: string;
  value: any;
}

export interface CSVImportWarning {
  row: number;
  field: string;
  message: string;
  value: any;
}

// Field mapping types
export interface FieldMapping {
  sceneNumber: string;
  imagePrompt: string;
  videoPrompt: string;
}

export interface CSVFieldOption {
  value: string;
  label: string;
  sample?: string;
  detected: boolean;
}

export interface CSVPreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
  suggestedMapping: FieldMapping;
}

export interface CSVMappingConfig {
  requiredFields: string[];
  autoDetect: boolean;
  strictMode: boolean;
  allowEmptyValues: boolean;
}

// API Configuration types for custom AI providers
export interface APIConfiguration {
  id: string;
  name: string;
  type: 'image' | 'video' | 'both';
  endpoint: string;
  method: 'POST' | 'GET';
  headers: APIHeader[];
  requestTemplate: APIRequestTemplate;
  responseParser: APIResponseParser;
  testSettings: APITestSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface APIHeader {
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

export interface APIRequestTemplate {
  format: 'json' | 'form-data' | 'raw';
  template: string; // JSON template or raw format
  parameters: APIParameter[];
  examples: APIExample[];
}

export interface APIParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  defaultValue?: any;
  options?: string[]; // For enum type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface APIExample {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface APIResponseParser {
  format: 'json' | 'xml' | 'text';
  imageUrlPath: string; // JSONPath or XPath to image URL
  statusPath: string; // JSONPath or XPath to status
  taskIdPath?: string; // JSONPath or XPath to task ID (for async APIs)
  pollEndpoint?: string; // Endpoint for polling task status
  pollMethod?: 'GET' | 'POST'; // HTTP method for polling
  metadataPaths?: {
    id?: string;
    cost?: string;
    generationTime?: string;
    [key: string]: string | undefined;
  };
  errorHandling: {
    errorPath: string;
    errorMessages: Record<string, string>;
  };
  asyncSettings?: {
    maxPollingTime: number; // Maximum polling time in milliseconds
    pollingInterval: number; // Polling interval in milliseconds
    completedStatus: string; // Status value indicating completion
    failedStatus: string; // Status value indicating failure
  };
}

export interface APITestSettings {
  testParameters: Record<string, any>;
  timeout: number; // milliseconds
  retryCount: number;
  retryDelay: number; // milliseconds
}

export interface APIConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  configuration: Omit<APIConfiguration, 'id' | 'name' | 'isActive' | 'createdAt' | 'updatedAt'>;
  isPopular: boolean;
}

export interface APIGenerationRequest {
  configId: string;
  parameters: Record<string, any>;
  sceneId?: string;
  type: 'image' | 'video';
}

export interface APIGenerationResult {
  id: string;
  configId: string;
  parameters: Record<string, any>;
  response: any;
  parsedData: {
    imageUrl?: string;
    videoUrl?: string;
    status: string;
    metadata?: Record<string, any>;
  };
  success: boolean;
  error?: string;
  generationTime: number;
  cost?: number;
  createdAt: Date;
}

// API Response types
export interface GenerationProgress {
  id: string;
  type: 'image' | 'video';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  result?: any;
  error?: string;
}

// Video Editor types
export interface VideoEditor {
  id: string;
  projectId: string;
  timeline: Timeline;
  currentTime: number; // Current playback position in seconds
  isPlaying: boolean;
  volume: number; // 0-1
  zoom: number; // Timeline zoom level
  selectedSegments: string[]; // Selected video segment IDs
  playbackRate: number; // 0.25, 0.5, 1, 1.5, 2, etc.
}

export interface VideoEditorState {
  editor: VideoEditor | null;
  isLoading: boolean;
  isExporting: boolean;
  exportProgress: number;
  error: string | null;
}

export interface EditingTool {
  id: string;
  name: string;
  icon: string;
  type: 'select' | 'trim' | 'split' | 'transition' | 'text' | 'audio' | 'effect';
  isActive: boolean;
}

export interface TextOverlay {
  id: string;
  text: string;
  font: string;
  fontSize: number;
  color: string;
  position: { x: number; y: number };
  startTime: number;
  endTime: number;
  animation?: 'fade' | 'slide' | 'zoom' | 'typewriter';
}

export interface VideoEffect {
  id: string;
  type: 'brightness' | 'contrast' | 'saturation' | 'blur' | 'sepia' | 'grayscale';
  intensity: number; // 0-1 or -100 to 100
  startTime: number;
  endTime: number;
}

export interface ExportSettings {
  format: 'mp4' | 'mov' | 'webm' | 'avi';
  resolution: { width: number; height: number };
  quality: 'low' | 'medium' | 'high' | 'ultra';
  frameRate: number;
  bitrate: number;
  audioSettings: {
    codec: 'aac' | 'mp3' | 'wav';
    bitrate: number;
    sampleRate: number;
  };
  includeSubtitles: boolean;
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
  };
}

export interface ExportJob {
  id: string;
  settings: ExportSettings;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  outputPath?: string;
  fileSize?: number;
  duration?: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// Timeline editing types
export interface TimelineTrack {
  id: string;
  type: 'video' | 'audio' | 'text' | 'effect';
  name: string;
  segments: VideoSegment[] | AudioTrack[] | TextOverlay[] | VideoEffect[];
  isLocked: boolean;
  isMuted: boolean;
  volume: number; // 0-1
  height: number; // Track height in pixels
}

export interface TimelineSelection {
  startTime: number;
  endTime: number;
  trackIds: string[];
  segmentIds: string[];
}

export interface TimelineViewport {
  startTime: number;
  endTime: number;
  scale: number; // pixels per second
  width: number; // viewport width in pixels
  height: number; // viewport height in pixels
}

// Video processing types
export interface VideoProcessingJob {
  id: string;
  type: 'trim' | 'merge' | 'transition' | 'effect' | 'export';
  inputFiles: string[];
  outputFile?: string;
  settings: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// Shortcuts and hotkeys
export interface EditorShortcut {
  key: string;
  modifiers: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  action: string;
  description: string;
  category: 'playback' | 'editing' | 'navigation' | 'file' | 'view';
}

// Remotion related types
export interface RemotionTimeline {
  id: string;
  name: string;
  duration: number;
  fps: number;
  width: number;
  height: number;
  backgroundColor: string;
  segments: RemotionVideoSegment[];
  transitions: RemotionTransition[];
  audioTracks: RemotionAudioTrack[];
  textOverlays: RemotionTextOverlay[];
  effects: RemotionVideoEffect[];
  metadata: TimelineMetadata;
}

export interface RemotionVideoSegment {
  id: string;
  videoSrc: string;
  thumbnailSrc?: string;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  position: { x: number; y: number; width: number; height: number };
  opacity: number;
  scale: number;
  rotation: number;
  transitionIn?: RemotionTransition;
  transitionOut?: RemotionTransition;
  effects: RemotionVideoEffect[];
}

export interface RemotionTransition {
  id: string;
  type: 'fade' | 'slide' | 'zoom' | 'dissolve' | 'crossfade';
  duration: number;
  position: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  intensity: number;
  properties: Record<string, any>;
}

export interface RemotionAudioTrack {
  id: string;
  name: string;
  audioSrc: string;
  startTime: number;
  duration: number;
  volume: number;
  trimStart: number;
  trimEnd: number;
  fadeIn: number;
  fadeOut: number;
  mute: boolean;
  effects: RemotionAudioEffect[];
}

export interface RemotionAudioEffect {
  id: string;
  type: 'volume' | 'fade' | 'filter';
  properties: Record<string, any>;
}

export interface RemotionTextOverlay {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  position: { x: number; y: number };
  startTime: number;
  duration: number;
  animation?: RemotionTextAnimation;
  effects: RemotionTextEffect[];
}

export interface RemotionTextAnimation {
  type: 'fade' | 'slide' | 'typewriter' | 'bounce';
  duration: number;
  easing: string;
  properties: Record<string, any>;
}

export interface RemotionTextEffect {
  id: string;
  type: 'shadow' | 'stroke' | 'blur';
  properties: Record<string, any>;
}

export interface RemotionVideoEffect {
  id: string;
  type: 'brightness' | 'contrast' | 'saturation' | 'blur' | 'sepia' | 'grayscale' | 'zoom' | 'rotate';
  intensity: number;
  properties: Record<string, any>;
}

export interface TimelineMetadata {
  createdAt: Date;
  updatedAt: Date;
  version: string;
  description?: string;
  tags?: string[];
}

// Remotion Editor Store
export interface RemotionEditorStore {
  // Project state
  currentProject: Project | null;
  timeline: RemotionTimeline | null;
  currentSettings: RemotionSettings;

  // Editor state
  selectedSegment: string | null;
  selectedTool: RemotionEditingToolType;
  currentTime: number;
  isPlaying: boolean;
  zoom: number;

  // Preview state
  previewMode: 'low' | 'medium' | 'high';
  isRendering: boolean;
  renderProgress: number;

  // History state
  history: HistoryEntry[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  updateTimeline: (timeline: Partial<RemotionTimeline>) => void;
  addVideoSegment: (segment: Omit<RemotionVideoSegment, 'id'>) => void;
  removeSegment: (segmentId: string) => void;
  updateSegment: (segmentId: string, updates: Partial<RemotionVideoSegment>) => void;

  // Editing operations
  selectSegment: (segmentId: string | null) => void;
  setPlaybackTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;

  // History operations
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;

  // Rendering operations
  startRender: (settings: RemotionExportSettings) => Promise<void>;
  cancelRender: () => void;

  // Tool operations
  splitSegment: (segmentId: string, time: number) => void;
  trimSegment: (segmentId: string, startTime: number, endTime: number) => void;
  duplicateSegment: (segmentId: string) => void;
}

export interface RemotionSettings {
  fps: number;
  width: number;
  height: number;
  backgroundColor: string;
  quality: number;
}

export type RemotionEditingToolType =
  | 'select'
  | 'trim'
  | 'split'
  | 'transition'
  | 'text'
  | 'audio'
  | 'effect'
  | 'move';

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  action: string;
  description: string;
  data: Partial<RemotionTimeline>;
}

export interface RemotionExportSettings {
  format: 'mp4' | 'mov' | 'webm' | 'avi';
  resolution: { width: number; height: number };
  quality: 'low' | 'medium' | 'high' | 'ultra';
  fps: number;
  bitrate: number;
  audioSettings: {
    codec: 'aac' | 'mp3' | 'wav';
    bitrate: number;
    sampleRate: number;
  };
  outputPath?: string;
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
  };
}

// Render job for Remotion
export interface RemotionRenderJob {
  id: string;
  timelineId: string;
  settings: RemotionExportSettings;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  outputPath?: string;
  fileSize?: number;
  duration?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  logs: string[];
}

// Enhanced image generation types
export interface ImageGenerationConfig {
  id: string;
  name: string;
  type: 'image';
  endpoint: string;
  apiKey: string;
  isActive: boolean;
  provider: string;
  model: string;
  settings: Record<string, any>;
  maxRetries?: number;
  timeout?: number;
  rateLimitPerMinute?: number;
  supportedFormats?: string[];
  maxResolution?: { width: number; height: number };
}

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  numberOfImages: number;
  quality: 'standard' | 'high';
  style?: string;
  seed?: number;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  model?: string;
  settings?: Record<string, any>;
}

export interface ImageGenerationResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  images?: GeneratedImage[];
  progress?: number;
  error?: string;
  metadata?: {
    generationTime: number;
    cost?: number;
    provider: string;
    model: string;
    parameters: Record<string, any>;
  };
  createdAt: Date;
  completedAt?: Date;
}

export interface ImageGenerationProgress {
  id: string;
  sceneId: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentImage?: number;
  totalImages?: number;
  images?: GeneratedImage[];
  error?: string;
  startTime: Date;
  endTime?: Date;
  configId: string;
  configName: string;
}

export interface ImageGenerationTask {
  id: string;
  type: 'image';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  sceneId: string;
  request: ImageGenerationRequest;
  response?: ImageGenerationResponse;
  error?: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ImageGenerationJob {
  id: string;
  sceneId: string;
  configId: string;
  prompt: string;
  settings: ImageGenerationSettings;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: GeneratedImage[];
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number; // seconds
}

export interface ImageGenerationQueue {
  id: string;
  name: string;
  jobs: ImageGenerationJob[];
  maxConcurrentJobs: number;
  isProcessing: boolean;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number; // seconds
}

// Evolink API specific types
export interface EvolinkImageGenerationRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  num_images?: number;
  quality?: 'standard' | 'hd';
  style?: string;
  seed?: number;
  cfg_scale?: number;
  steps?: number;
  sampler?: string;
  model?: string;
  settings?: Record<string, any>;
}

export interface EvolinkImageGenerationResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  images?: EvolinkGeneratedImage[];
  progress?: number;
  error?: string;
  metadata?: {
    generation_time: number;
    cost?: number;
    provider: string;
    model: string;
    parameters: Record<string, any>;
  };
  created_at: string;
  completed_at?: string;
}

export interface EvolinkGeneratedImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  width: number;
  height: number;
  size: number; // bytes
  format: string;
  prompt: string;
  negative_prompt?: string;
  seed: number;
  steps: number;
  cfg_scale: number;
  sampler: string;
  model: string;
  generation_time: number;
  cost?: number;
  metadata?: Record<string, any>;
}

// Enhanced image metadata types
export interface ImageAnalysisMetadata {
  dominantColors: string[];
  brightness: number; // 0-1
  contrast: number; // 0-1
  saturation: number; // 0-1
  sharpness: number; // 0-1
  complexity: 'low' | 'medium' | 'high';
  style?: string;
  content?: {
    people: number;
    objects: string[];
    scenery: string[];
    emotions?: string[];
  };
  technical: {
    iso?: number;
    aperture?: string;
    focalLength?: number;
    cameraModel?: string;
  };
}

export interface ImageOptimizationSettings {
  compressionLevel: number; // 0-100
  maxWidth?: number;
  maxHeight?: number;
  format: 'jpeg' | 'png' | 'webp' | 'avif';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  preserveMetadata: boolean;
  stripExif: boolean;
}

export interface ImageBatchOperation {
  id: string;
  type: 'resize' | 'compress' | 'convert' | 'filter' | 'watermark';
  images: string[]; // image IDs
  settings: ImageOptimizationSettings;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results?: string[]; // processed image IDs
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}