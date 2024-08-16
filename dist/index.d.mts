interface IAudioMergerNode {
    id: string;
    name: string;
    analyser: AnalyserNode;
    audioData: Uint8Array;
    audioSource: MediaStreamAudioSourceNode | MediaElementAudioSourceNode;
    gainNode: GainNode;
}
declare class AudioMerger {
    #private;
    private readonly audioContext;
    private readonly videoSyncDelayNode;
    audioDestination: MediaStreamAudioDestinationNode;
    constructor();
    getContext(): AudioContext;
    getOutputStream(): MediaStream;
    getSources(): Map<string, IAudioMergerNode>;
    getSource(id: string): IAudioMergerNode | undefined;
    addSource(name: string, source: MediaStream | HTMLMediaElement): IAudioMergerNode | null;
    removeSource(id: string): void;
    updateVolume(id: string, volume: number): void;
    getVolumeInDecibels(id: string): number | null;
    destroy(): void;
}

export { type IAudioMergerNode, AudioMerger as default };
