# TV App with Video.js Integration

This TV app now includes video.js integration for high-quality video playback with advanced features.

## Features

- **Video.js Integration**: Professional-grade video player with customizable controls
- **Subtitle Support**: Multi-language subtitle support using WebVTT format
- **Remote Control Navigation**: Full keyboard and remote control support for TV environments
- **Fullscreen Playback**: Videos automatically play in fullscreen with navbar
- **Responsive Design**: Works on various screen sizes and devices

## Video Player Controls

The video player includes the following controls:

- Play/Pause: Press Enter or click the play button
- Volume: Use Up/Down arrow keys or volume slider
- Seek: Use Left/Right arrow keys or progress bar
- Fullscreen: Automatic on playback, can be toggled
- Subtitles: Toggle subtitles and select language
- Playback Speed: Change video playback rate

## Remote Control Navigation

When the video player is active, you can use the following keys:

- **Up/Down**: Adjust volume
- **Left/Right**: Seek backward/forward 10 seconds
- **Enter**: Play/Pause
- **Escape**: Exit player and return to movie selection

## Adding Subtitles

Subtitles are supported in WebVTT format. Place subtitle files in the `subtitles` directory and reference them in the `playVideo` function in `MoviesPage.js`.

Example subtitle format:

```
WEBVTT

00:00:01.000 --> 00:00:04.000
This is a subtitle

00:00:05.000 --> 00:00:08.000
This is another subtitle
```

## Customization

The video player can be customized by modifying:

- `components/VideoPlayer.js`: Player functionality and options
- `styles/videoPlayer.css`: Visual styling of the player
- `pages/MoviesPage.js`: Integration with the movie selection interface

## Dependencies

- Video.js 8.10.0: https://videojs.com/ 