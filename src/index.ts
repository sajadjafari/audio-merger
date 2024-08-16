export interface IAudioMergerNode {
    id: string;
    name: string;
    analyser: AnalyserNode;
    audioData: Uint8Array;
    audioSource: MediaStreamAudioSourceNode | MediaElementAudioSourceNode;
    gainNode: GainNode;
}

export default class AudioMerger {
    private readonly audioContext: AudioContext;

    private readonly videoSyncDelayNode: DelayNode;

    public audioDestination: MediaStreamAudioDestinationNode;

    readonly #sources = new Map<string, IAudioMergerNode>();

    constructor() {
        this.audioContext = new AudioContext();
        this.audioDestination = this.audioContext.createMediaStreamDestination();
        // Delay node for video sync
        this.videoSyncDelayNode = this.audioContext.createDelay(5.0);
        this.videoSyncDelayNode.connect(this.audioDestination);
        // HACK for wowza #7, #10
        // Gain node prevents quality drop
        const gain = this.audioContext.createGain();
        const constantAudioNode = this.audioContext.createConstantSource();
        gain.gain.value = 0;
        constantAudioNode.start();
        constantAudioNode.connect(gain);
        gain.connect(this.videoSyncDelayNode);
        // Stop browser from throttling timers by playing almost-silent audio
        const source = this.audioContext.createConstantSource();
        const gainNode = this.audioContext.createGain();
        // Required to prevent popping on start
        gainNode.gain.value = 0.001;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start();
    }

    getContext(): AudioContext {
        return this.audioContext;
    }

    getOutputStream(): MediaStream {
        return this.audioDestination.stream;
    }

    getSources(): Map<string, IAudioMergerNode>{
        return this.#sources;
    }

    getSource(id: string): IAudioMergerNode | undefined {
        return this.#sources.get(id);
    }

    addSource(name: string, source: MediaStream | HTMLMediaElement): IAudioMergerNode | null {
        if (!(source instanceof MediaStream) && !(source instanceof HTMLMediaElement)) {
            console.warn('AudioMixer: You can only add MediaStream & HTMLMediaElement sources!');
            return null;
        }
        const foundedStreamNode = this.#sources.get(source.id);
        if (foundedStreamNode) {
            console.warn('AudioMixer: This source has been added before!', source.id);
            return foundedStreamNode;
        }

        const audioSource =
            source instanceof MediaStream
                ? this.audioContext.createMediaStreamSource(source)
                : this.audioContext.createMediaElementSource(source);
        const audioOutput = this.audioContext.createGain();
        const gainNode = audioSource.context.createGain();
        const analyser = this.audioContext.createAnalyser();

        audioOutput.gain.value = 1;
        gainNode.gain.setValueAtTime(1, (audioSource.context as unknown as BaseAudioContext).currentTime);
        audioSource.connect(gainNode);
        gainNode.connect(audioOutput);
        audioOutput.connect(this.videoSyncDelayNode);
        analyser.fftSize = 256;
        audioSource.connect(analyser);

        const node = {
            id: source.id,
            name,
            audioSource,
            analyser,
            audioData: new Uint8Array(analyser.frequencyBinCount),
            gainNode,
        } as IAudioMergerNode;

        this.#sources.set(source.id, node);

        return node;
    }

    removeSource(id: string) {
        const {audioSource, analyser} = this.#sources.get(id) || {};
        if (audioSource) {
            if (audioSource instanceof MediaStream) {
                audioSource.getTracks().forEach(track => {
                    track.stop();
                });
            }
            if (audioSource instanceof MediaElementAudioSourceNode) {
                audioSource.mediaElement.pause();
                audioSource.mediaElement.remove();
            }
            if (analyser) audioSource.disconnect(analyser);
            this.#sources.delete(id);
        }
    }

    updateVolume(id: string, volume: number) {
        const context = this.getContext();
        const mediaSource = this.getSource(id);
        if (context && mediaSource) {
            mediaSource.gainNode.gain.setValueAtTime(volume / 100, context.currentTime);
        }
    }

    getVolumeInDecibels(id: string) {
        const node = this.#sources.get(id);
        if (node) {
            node.analyser.getByteFrequencyData(node.audioData);
            // Calculate the average amplitude of the audio signal
            let sum = 0;
            node.audioData.forEach(value => {
                sum += value;
            });
            const averageAmplitude = sum / node.analyser.frequencyBinCount;
            // Convert the average amplitude to dB
            const val = Math.floor(20 * Math.log10(averageAmplitude / 255));
            return val === -Infinity ? 0 : val;
        }
        return null;
    }

    destroy() {
        // Remove all added sources
        Array.from(this.#sources).map(([, source]) => this.removeSource(source.id));
        // Destroy context and nodes
        this.audioDestination.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        this.audioDestination.disconnect();
        this.videoSyncDelayNode.disconnect();
        void this.audioContext.close();
    }
}
