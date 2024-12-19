import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ClockComponent from "./components/ClockComponent";

const socket = io("http://localhost:8000");

type Event = {
  event: string;
  time: Date;
  user: string;
};

type SubathonConfig = {
  maxEndTime: number;
  maxSleepTime: {
    night: number;
    day: number;
  };
  goals: Map<number, string>;
  points: number;
};

function App() {
  const [minutes, setMinutes] = useState(60);
  const [subathonEndsUnix, setSubathonEndsUnix] = useState(0);
  const [subathonStartedUnix, setSubathonStartedUnix] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [eventList, setEventList] = useState<Event[]>([]);
  const [config, setConfig] = useState<SubathonConfig | null>(null);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    socket.connect();
    console.log("Connected to socket", subathonStartedUnix);
    socket.on(
      "subathonUpdate",
      (data: {
        events: Event[];
        timeRemaining: number;
        isActive: boolean;
        config: SubathonConfig;
      }) => {
        console.log("Subathon update", data);
        setIsActive(data.isActive);
        if (data.isActive) {
          const now = Math.floor(Date.now() / 1000);
          setSubathonEndsUnix(now + data.timeRemaining);
        }
        setEventList(data.events.slice(0, 5));
        setConfig(data.config);
        setPoints(data.config.points);
      }
    );

    socket.on("pointsUpdate", (points: number) => {
      setPoints(points);
    });

    return () => {
      socket.off("subathonUpdate");
      socket.off("pointsUpdate");
      socket.disconnect();
    };
  }, []);

  const handleStart = () => {
    socket.emit("startSubathon", minutes);
    setIsActive(true);
    setSubathonStartedUnix(Math.floor(Date.now() / 1000));
    setSubathonEndsUnix(Math.floor(Date.now() / 1000) + minutes * 60);
  };

  const GoalsList = () => (
    <ScrollArea className="h-[200px] w-full rounded-md mt-4">
      <div className="space-y-2">
        {config &&
          Array.from(config.goals.entries()).map(([points, goal]) => (
            <Card
              key={points}
              className={`${
                points <= points ? "bg-green-800" : "bg-transparent"
              } border-none`}
            >
              <CardContent className="p-2">
                <div className="flex justify-between">
                  <span>{goal}</span>
                  <span>{points} points</span>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </ScrollArea>
  );

  return (
    <div className="container p-4 w-full">
      <Card className="w-full bg-transparent border-none">
        <CardHeader>
          <CardTitle className="text-center text-4xl font-bold">
            {isActive ? (
              <ClockComponent unixTimestamp={subathonEndsUnix} />
            ) : (
              "Subathon Inactive"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isActive ? (
            <div className="flex gap-4 justify-center items-center">
              <Input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                min="1"
                className="w-32"
              />
              <Button onClick={handleStart} disabled={isActive} size="lg">
                Start Subathon
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px] w-full rounded-md">
              <div className="space-y-4 w-full">
                {eventList?.map((event, index) => (
                  <Card
                    key={index}
                    className="bg-transparent border-none w-full"
                  >
                    <div className="flex justify-between">
                      <h3 className="font-semibold text-neutral-100 w-2/3">
                        {event.event}
                      </h3>
                      <div className="flex flex-col items-start w-1/3 ml-4">
                        <p className="text-sm text-neutral-300 text-muted-foreground">
                          {new Date(event.time).toLocaleTimeString("fi-FI", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </p>
                        <p className="text-sm text-neutral-200 text-muted-foreground">
                          {event.user}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {isActive && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Points: {points}</CardTitle>
          </CardHeader>
          <CardContent>
            <GoalsList />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default App;
