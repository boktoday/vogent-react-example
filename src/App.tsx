import { useCallback, useRef, useState } from 'react'
import './App.css'
import { Button, Card, Flex, Separator, Spinner, Text } from '@radix-ui/themes'
import { VogentCall, dialStatusIsComplete, VogentAudioConn } from '@vogent/vogent-web-client'
import { CheckCircleIcon, PhoneXMarkIcon } from '@heroicons/react/24/solid'
import { useLiveTranscript } from './hooks'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/plain.css'

type VogentDial = {
  dialToken: string;
  dialId: string;
  sessionId: string;
}

const baseUrl = 'https://api.getelto.com';

// IMPORTANT: Make sure to replace this with a server-side implementation. You
// should not expose your API keys to the client.
async function createBrowserDial() {
  const res = await fetch(`${baseUrl}/api/dials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_VOGENT_API_KEY}`,
    },
    body: JSON.stringify({
      browserCall: true,
      callAgentId: import.meta.env.VITE_CALL_AGENT_ID,
    }),
  });

  const dial = await res.json() as VogentDial;

  return dial;
}

// IMPORTANT: Make sure to replace this with a server-side implementation. You
// should not expose your API keys to the client.
async function createPhoneDial(toNumber: string) {
  const res = await fetch(`${baseUrl}/api/dials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_VOGENT_API_KEY}`,
    },
    body: JSON.stringify({
      toNumber,
      callAgentId: import.meta.env.VITE_CALL_AGENT_ID,
      fromNumberId: import.meta.env.VITE_FROM_PHONE_NUMBER_ID,
    }),
  });

  const dial = await res.json() as VogentDial;

  return dial;
}

function prettifyCallStatus(status: string) {
  if (status === 'queued') {
    return 'Queued';
  } else if (status === 'ringing') {
    return 'Ringing';
  } else if (status === 'in-progress') {
    return 'In Progress';
  }

  return status;
}

function CallControls(props: {
  callStatus: string,
  vogentCall: VogentCall,
  vogentAudioConn: VogentAudioConn | null,
  connectAudio: () => void,
  muted: boolean,
}) {
  const { callStatus, vogentCall, vogentAudioConn, connectAudio, muted } = props;
  const [isPaused, setIsPaused] = useState(false);
  return (
    <Flex direction={"column"} align={"center"} gap={"4"}>
      <Text>{prettifyCallStatus(callStatus)}</Text>
      {callStatus !== 'queued' && (
        <Flex gap={"2"}>
          <Button
            onClick={async () => {
              await vogentCall.hangup();
            }}>
            <PhoneXMarkIcon style={{ width: '1rem', height: '1rem' }} />
          </Button>
          <Button onClick={() => {
            vogentCall.setPaused(!isPaused).then(() => {
              setIsPaused(!isPaused);
            });
          }}>
            {isPaused ? (
              <span>Resume AI</span>
            ) : (
              <span>Pause AI</span>
            )}
          </Button>
          {vogentAudioConn && (
            <Button onClick={() => {
              vogentAudioConn.mute(!muted);
            }}>
              {muted ? (
                <span>Unmute</span>
              ) : (
                <span>Mute</span>
              )}
            </Button>
          )}
          {!vogentAudioConn ? (
            // Patch into the call
            <Button onClick={() => {
              connectAudio();
            }}>
              Patch Audio
            </Button>
          ) : (
            <Button onClick={() => {
              vogentAudioConn.disconnect();
            }}>
              Disconnect Audio
            </Button>
          )}
        </Flex>
      )}
    </Flex>
  )
}

function App() {
  const vogentCallRef = useRef<VogentCall | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [vogentAudioConn, setVogentAudioConn] = useState<VogentAudioConn | null>(null);
  const [callStatus, _setCallStatus] = useState<{
    status: string;
  } | null>(null);
  const [muted, setMuted] = useState(false);
  const [phone, setPhone] = useState('');

  const callStatusRef = useRef(callStatus);
  const setCallStatus = useCallback(
    (cdata: { status: string }) => {
      callStatusRef.current = cdata;
      _setCallStatus(cdata);
    },
    [_setCallStatus]
  );

  const { transcript } = useLiveTranscript({
    vogentCall: vogentCallRef.current,
    skip: !callStatus,
  });

  const connectAudio = async (call: VogentCall, liveListen: boolean = false) => {
    // For browser calls, we need to patch into the call to start the call.
    await call.connectAudio(liveListen).then((conn) => {
      setVogentAudioConn(conn);
      conn.on('mute', (m: boolean) => {
        setMuted(m);
      });

      conn.on('disconnect', () => {
        setVogentAudioConn(null);
      });
    });
  }

  // Handle creating a browser dial. Connects audio directly.
  const handleBrowserDialClicked = async () => {
    setConnecting(true);

    // Create the browser dial.
    console.log('Creating dial');
    const dial = await createBrowserDial();
    console.log('Dial created', dial);

    // Create the local vogent client that you can use to control the call.
    const call = new VogentCall({
      sessionId: dial.sessionId,
      dialId: dial.dialId,
      token: dial.dialToken,
    }, {
      baseUrl,
    });

    call.on('status', (s: string) => {
      setCallStatus({
        ...callStatusRef.current,
        status: s,
      });
    });

    await call.start();
    await connectAudio(call);

    if (!callStatusRef.current?.status) {
      setCallStatus({
        ...callStatusRef.current,
        status: 'queued',
      });
    }

    vogentCallRef.current = call;
    setConnecting(false);
  }

  // Handle creating a phone dial. Doesn't connect audio directly
  const handlePhoneDialClicked = async () => {
    setConnecting(true);

    // Create the phone dial.
    console.log('Creating dial');
    const dial = await createPhoneDial(phone);
    console.log('Dial created', dial);

    // Create the local vogent client that you can use to control the call.
    const call = new VogentCall({
      sessionId: dial.sessionId,
      dialId: dial.dialId,
      token: dial.dialToken,
    }, {
      baseUrl,
    });

    call.on('status', (s: string) => {
      setCallStatus({
        ...callStatusRef.current,
        status: s,
      });
    });

    await call.start();

    if (!callStatusRef.current?.status) {
      setCallStatus({
        ...callStatusRef.current,
        status: 'queued',
      });
    }

    vogentCallRef.current = call;
    setConnecting(false);
  }

  return (
    <Flex style={{
      width: '100%',
    }} justify={"center"}>
      <Flex direction={"column"} gap={"3"} style={{
        width: '40rem',
        marginTop: '5rem',
      }}>
        {!callStatus && (
          !connecting ? (
            <Flex direction={"column"} gap={"3"} align={"center"} justify={"center"}>
              <Button
                className="w-full"
                onClick={handleBrowserDialClicked}>
                <div>
                  <span>Browser Call</span>
                </div>
              </Button>
              <Separator style={{
                width: '100%',
              }} />
              <Flex align={"center"} gap={"3"}>
                <PhoneInput
                  country={'us'}
                  value={phone}
                  onChange={phone => setPhone(phone)}
                />
                <Button
                  className="w-full"
                  onClick={handlePhoneDialClicked}>
                  {connecting ? (
                    <div>
                      <span>Connecting Audio</span>
                      <Spinner />
                    </div>
                  ) : (
                    <div>
                      <span>Phone Call</span>
                    </div>
                  )}
                </Button>
              </Flex>
            </Flex>
          ) : <Flex direction={"column"} gap={"3"} align={"center"} justify={"center"}>
            Connecting...
          </Flex>
        )}
        {callStatus && vogentCallRef.current &&
          (!dialStatusIsComplete(callStatus.status) ? (
            <CallControls
              vogentAudioConn={vogentAudioConn}
              connectAudio={() => {
                if (vogentCallRef.current) {
                  connectAudio(vogentCallRef.current, true);
                }
              }}
              callStatus={callStatus.status}
              vogentCall={vogentCallRef.current}
              muted={muted}
            />
          ) : (
            <CheckCircleIcon style={{ width: '2rem', height: '2rem' }} />
          ))}
        <Card style={{
          width: '100%',
        }}>
          {transcript ? (
            <Flex direction={"column"} gap={"3"}>
              {transcript.map((t) => (
                <Flex direction={"column"} gap={"1"}>
                  <Text size={"1"} color={"gray"}>{t.speaker}</Text>
                  <Text>{t.text}</Text>
                </Flex>
              ))}
            </Flex>
          ) : <Flex justify={"center"} align={"center"} style={{
            height: '10rem',
          }}>
            <Text>No transcript yet</Text>
          </Flex>}
        </Card>
      </Flex>
    </Flex>
  );
}

export default App
