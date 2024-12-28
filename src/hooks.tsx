import { useState } from "react";

import { VogentCall, Transcript } from "@vogent/vogent-web-client/VogentCall";
import { useEffect } from "react"

export const useLiveTranscript = (props: {
  vogentCall: VogentCall | null,
  skip?: boolean
}) => {
  const { vogentCall, skip = false } = props;
  const [transcript, setTranscript] = useState<Transcript | null>(null);

  useEffect(() => {
    if (!vogentCall || skip) return;

    console.log('useLiveTranscript', vogentCall);

    const cancel = vogentCall.monitorTranscript((transcript) => {
      setTranscript(transcript);
    });

    return () => {
      cancel();
    }
  }, [vogentCall, setTranscript, skip]);

  return {
    transcript: transcript,
  }
}
