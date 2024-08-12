interface IMediaStreamNode {
    analyser: AnalyserNode;
    audioData: Uint8Array;
    mediaStream: MediaStreamAudioSourceNode | MediaElementAudioSourceNode;
    gainNode: GainNode;
}

declare class AudioMerger {
    readonly audioContext: AudioContext;

    readonly videoSyncDelayNode: DelayNode;

    public audioDestination: MediaStreamAudioDestinationNode;

    private sources: Record<string, IMediaStreamNode>;

    public getContext(): AudioContext;

    public getMediaStreamSource(streamId: string): IMediaStreamNode;

    public getSources(): Record<string, IMediaStreamNode>;

    public addSource(source: MediaStream | HTMLMediaElement): IMediaStreamNode | null;

    public removeSource(streamId: string);

    public updateVolume(streamId: string, volume: number);

    public getVolumeInDecibels(streamId: string): number | null;

}