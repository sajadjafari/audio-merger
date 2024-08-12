export default class AudioMerger {
    // AudioContext
    audioContext;
    // DelayNode
    videoSyncDelayNode;
    // MediaStreamAudioDestinationNode
    audioDestination;
    // List of all added audio-sources
    #sources = new Map();

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

    getContext() {
        return this.audioContext;
    }

    getMediaStreamSource(streamId) {
        return this.#sources.get(streamId);
    }

    getSources() {
        return this.#sources;
    }

    addSource(source) {
        if (!(source.source instanceof MediaStream) && !(source.source instanceof HTMLMediaElement)) {
            return null;
        }
        const foundedStreamNode = this.#sources.get(source.id);
        if (foundedStreamNode !== undefined) {
            return foundedStreamNode;
        }
        const audioSource =
            source.source instanceof MediaStream
                ? this.audioContext.createMediaStreamSource(source.source)
                : this.audioContext.createMediaElementSource(source.source);
        const audioOutput = this.audioContext.createGain();
        const gainNode = audioSource.context.createGain();

        audioOutput.gain.value = 1;
        gainNode.gain.setValueAtTime(source.volume / 100, audioSource.context.currentTime);
        audioSource.connect(gainNode);
        gainNode.connect(audioOutput);
        audioOutput.connect(this.videoSyncDelayNode);

        const node = {};
        node.mediaStream = audioSource;
        node.analyser = this.audioContext.createAnalyser();
        node.analyser.fftSize = 256;
        node.audioData = new Uint8Array(node.analyser.frequencyBinCount);
        node.gainNode = gainNode;
        node.mediaStream.connect(node.analyser);

        this.#sources.set(source.id, node);

        return node;
    }

    removeSource(streamId) {
        const streamNode = this.#sources.get(streamId);
        if (streamNode) {
            if (streamNode.mediaStream instanceof MediaStreamAudioSourceNode) {
                streamNode.mediaStream.mediaStream.getTracks().forEach(track => {
                    track.stop();
                });
            }
            streamNode.mediaStream.disconnect(streamNode.analyser);
            streamNode.mediaStream = null;
            streamNode.analyser = null;
            streamNode.audioData = null;
            streamNode.gainNode = null;
            this.list.delete(streamId);
        }
    }

    updateVolume(streamId, volume) {
        const context = this.getAudioContext();
        const mediaSource = this.getMediaStreamSource(streamId);
        if (context && mediaSource) {
            mediaSource.gainNode.gain.setValueAtTime(volume / 100, context.currentTime);
        }
    }

    getVolumeInDecibels(streamId) {
        const node = this.#sources.get(streamId);
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
}
