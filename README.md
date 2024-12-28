# Vogent React Example App

This app includes an example of both working with browser calls and monitoring phone calls with the `@vogent/vogent-web-client` package. To run application, you can run:

```
VITE_VOGENT_API_KEY={api_key} VITE_CALL_AGENT_ID={agent_id} VITE_FROM_PHONE_NUMBER_ID={number_id} yarn run dev
```

## Security Note
Make sure you **do not** use the functions `createBrowserDial` and `createPhoneDial` in production client code. These functions use your API keys, which should not be exposed to any client code. The API calls return a `dialToken` which is safe to share with the client, and can only be used to control that specific dial.

## Monitoring Transcripts
We immediately monitor the transcript for these calls with `VogentCall.monitorTranscript` -- see `src/hooks.tsx` for the implementation of live transcription monitoring.

## Notes on Browser Calls
To create browser calls, we first create the dial with the Vogent API, and then create the `VogentCall` with the API response from `createBrowserDial` passed as arguments. We call `connectAudio` on the resulting `VogentCall` object immediately, to start the call. You can use the `VogentAudioConn` returned by `connectAudio` to mute/unmute the audio, and to disconnect the audio connection.

## Notes on Phone Calls
Phone calls in the sample app don't immediately patch into the call audio. You'll have to patch into the call manually, which will call `connectAudio` with `liveListen` set to `true`. Any time you want to patch into a pre-existing call, you should call `connectAudio` with this flag set to `true`.
