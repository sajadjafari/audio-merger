# AudioMerger

## Overview

`AudioMerger` is a TypeScript class designed to merge multiple audio sources into a single media stream. It allows for the addition of audio sources from `MediaStream` and `HTMLMediaElement` objects, manages their volume, and provides methods to analyze the audio signal in real-time.

## Features

- **Audio Source Management**: Add, remove, and manage multiple audio sources.
- **Volume Control**: Adjust the volume of individual audio sources.
- **Real-time Audio Volume Analysis in **: Analyze the audio signal and retrieve volume levels in decibels.
- **Media Stream Output**: Combine all audio sources into a single `MediaStream` that can be used elsewhere (e.g., for recording or streaming).
- **Audio Context Management**: Efficiently manages the Web Audio API context, including handling browser-specific issues to ensure smooth audio processing.

## Installation

```bash
npm install typescript --save-dev
```

## Usage
### Initialization
To create an instance of AudioMerger, simply instantiate the class:

```typescript
import AudioMerger from './AudioMerger';

const audioMerger = new AudioMerger();
```

### Adding Audio Sources
You can add an audio source from either a MediaStream or an HTMLMediaElement:

`AudioMerger.addSource(id: string, source: MediaStream | HTMLMediaElement)`

```typescript
// Add a MediaStream source
audioMerger.addSource('Microphone(string id)', mediaStream);

// Add an HTMLMediaElement source
audioMerger.addSource('AudioElement (string id)', htmlMediaElement);
```

### Removing Audio Sources
To remove an audio source by its ID:

```typescript 
audioMerger.removeSource(id);
```

### Adjusting Volume
You can update the volume of a specific audio source (from 0 to 100):

```typescript
audioMerger.updateVolume(mediaStream.id, 50); // Set volume to 50%
```

### Getting Volume in Decibels
To get the current volume level in decibels for a specific audio source:

```typescript
const volumeInDecibels = audioMerger.getVolumeInDecibels(mediaStream.id);
console.log(`Volume in dB: ${volumeInDecibels}`);
```

### Get output stream
To get output stream of merged all sources you add: 

```typescript
audioMerger.getOutputStream();
```

### Destroying the AudioMerger
When you are done using the AudioMerger, you should destroy it to clean up resources:

```typescript
audioMerger.destroy();
```
This will remove all added sources, stop any active media tracks, and close the AudioContext.
