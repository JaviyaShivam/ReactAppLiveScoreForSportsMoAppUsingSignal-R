import React, { useState } from "react";
import * as signalR from "@microsoft/signalr";

const HUB_URL = "https://localhost:7269/gameHub";
//const HUB_URL = "https://sportsmo-api-dev-ehhggcfugdegd0ea.centralus-01.azurewebsites.net/gameHub";
//const HUB_URL = "https://sportsmo-api-test-gncbfqa2ekfqhgb4.centralus-01.azurewebsites.net/gameHub";
type GroupMembersDto = {
  userId: number;
  userName: string;
  firstName?: string;
  lastName?: string;
  userProfileImage?: string;
  amount: number;
};

type GroupDonationToPlayDto = {
  groupId: number;
  groupName: string;
  favoriteTeamId: number;
  amount: number;
  leaderId: number;
  groupMemberCount: number;
  groupMembers: GroupMembersDto[];
};

type DonationResponseDto = {
  // Add more fields as needed
  amount: number;
  donorName?: string;
  userId?: number;
};

type PlayDto = {
  id: number;
  gameId: number;
  playTypeName: string;
  playDescription: string;
  yards?: number;
  time?: string;
  down?: number;
  distance?: number;
  startPossessionTeamId?: number;
  quarter?: number;
  donations?: DonationResponseDto[];
  groupDonationToPlayDto?: GroupDonationToPlayDto[];
};

type DriveDto = {
  driveId: number;
  gameId: number;
  quarter: number;
  possessionTeamId?: number;
  plays?: PlayDto[];
  playCount: number;
};

function App() {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [liveGame, setLiveGame] = useState<DriveDto[]>([]);
  const [liveScore, setLiveScore] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [virtualField, setVirtualField] = useState<any>(null);
  const [totalDonations, setTotalDonations] = useState<any>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [gameId, setGameId] = useState<string>("");
  const [openChannelScores, setOpenChannelScores] = useState<any[]>([]);

  // Join status states
  const [isUserGameJoined, setIsUserGameJoined] = useState<boolean>(false);
  const [isGameJoined, setIsGameJoined] = useState<boolean>(false);
  const [isOpenChannelJoined, setIsOpenChannelJoined] = useState<boolean>(false);

  // Leave group handlers
  const leaveUserFromGame = () => {
    if (!userId || !gameId) {
      showToast("Please enter both User ID and Game ID.", "error");
      return;
    }
    connection?.invoke("LeaveUserFromGame", Number(userId), Number(gameId))
      .then(() => {
        setIsUserGameJoined(false);
        setMessages(msgs => [...msgs, "Left user+game group"]);
        showToast("Left user+game group", "success");
        console.log("Left user+game group");
      })
      .catch(err => {
        setMessages(msgs => [...msgs, "LeaveUserFromGame error: " + err]);
        showToast("LeaveUserFromGame error: " + (err?.message || err), "error");
        console.error("LeaveUserFromGame error", err);
      });
  };

  const leaveGame = () => {
    if (!gameId) {
      showToast("Please enter a Game ID.", "error");
      return;
    }
    connection?.invoke("LeaveGame", Number(gameId))
      .then(() => {
        setIsGameJoined(false);
        setMessages(msgs => [...msgs, "Left game group"]);
        showToast("Left game group", "success");
        console.log("Left game group");
      })
      .catch(err => {
        setMessages(msgs => [...msgs, "LeaveGame error: " + err]);
        showToast("LeaveGame error: " + (err?.message || err), "error");
        console.error("LeaveGame error", err);
      });
  };

  const leaveOpenChannel = () => {
    connection?.invoke("LeaveOpenChannelForLiveScore")
      .then(() => {
        setIsOpenChannelJoined(false);
        setMessages(msgs => [...msgs, "Left open channel for live scores"]);
        showToast("Left open channel for live scores", "success");
        console.log("Left open channel for live scores");
      })
      .catch(err => {
        setMessages(msgs => [...msgs, "LeaveOpenChannelForLiveScore error: " + err]);
        showToast("LeaveOpenChannelForLiveScore error: " + (err?.message || err), "error");
        console.error("LeaveOpenChannelForLiveScore error", err);
      });
  };

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "error" | "info" | "success" } | null>(null);

  // Show toast for 4 seconds
  const showToast = (message: string, type: "error" | "info" | "success" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const joinOpenChannel = () => {
    if (!connection) {
      showToast("Connect to SignalR first.", "error");
      return;
    }
    connection.invoke("JoinOpenChannelForLiveScore")
      .then(() => {
        setIsOpenChannelJoined(true);
        setMessages(msgs => [...msgs, "Joined open channel for live scores"]);
        showToast("Joined open channel for live scores", "success");
      })
      .catch(err => {
        setIsOpenChannelJoined(false);
        setMessages(msgs => [...msgs, "JoinOpenChannelForLiveScore error: " + err]);
        showToast("JoinOpenChannelForLiveScore error: " + (err?.message || err), "error");
      });
  };

  const [token, setToken] = useState<string>("");

  // Only connect when user clicks "Connect"
  const connectToSignalR = () => {
    if (!token) {
      showToast("Please enter a token before connecting.", "error");
      return;
    }
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    conn.onclose(() => {
      showToast("SignalR connection closed.", "error");
      console.log("SignalR connection closed");
    });
    conn.onreconnecting(() => {
      showToast("SignalR reconnecting...", "info");
      console.log("SignalR reconnecting...");
    });
    conn.onreconnected(() => {
      showToast("SignalR reconnected.", "success");
      console.log("SignalR reconnected");
    });

    conn.on("ReceiveLiveGame", (data: any) => {
      setMessages((msgs) => [
        ...msgs,
        "LiveGame: " + JSON.stringify(data),
      ]);
      // Fix: handle both array and single object for live games
      setLiveGame(Array.isArray(data) ? data : data ? [data] : []);
    });

    conn.on("ReceiveTotalDonations", (data: any) => {
      setMessages((msgs) => [
        ...msgs,
        "TotalDonations: " + JSON.stringify(data),
      ]);
      setTotalDonations(data);
    });

    conn.on("ReceiveLiveScore", (data: any) => {
      setMessages((msgs) => [
        ...msgs,
        "LiveScore: " + JSON.stringify(data),
      ]);
      setLiveScore(data);
    });

    conn.on("ReceiveQuarter", (data: any) => {
      setMessages((msgs) => [
        ...msgs,
        "Quarter: " + JSON.stringify(data),
      ]);
    });

    conn.on("ReceiveVirtualField", (data: any) => {
      setMessages((msgs) => [
        ...msgs,
        "VirtualField: " + JSON.stringify(data),
      ]);
      setVirtualField(data);
    });

    conn.on("ReceiveOpenLiveScore", (data: any) => {
      setMessages((msgs) => [
        ...msgs,
        "OpenChannelLiveScore: " + JSON.stringify(data),
      ]);
      setOpenChannelScores(scores => [data, ...scores]);
    });

    conn.on("ReceiveUpdatedBalance", (balance: number) => {
      setMessages((msgs) => [
        ...msgs,
        "WalletBalance: " + balance,
      ]);
      setWalletBalance(balance);
      showToast("Received updated wallet balance", "success");
    });

    conn.start()
      .then(() => {
        showToast("SignalR Connected.", "success");
        setConnection(conn);
      })
      .catch(err => {
        showToast("SignalR Connection Error: " + (err?.message || err), "error");
        console.error("SignalR Connection Error: ", err);
      });
  };

  const joinUserToGame = () => {
    if (!userId || !gameId) {
      showToast("Please enter both User ID and Game ID.", "error");
      return;
    }
    connection?.invoke("JoinUserToGame", Number(userId), Number(gameId))
      .then(() => {
        setIsUserGameJoined(true);
        setMessages(msgs => [...msgs, "Joined user+game group"]);
        showToast("Joined user+game group", "success");
        console.log("Joined user+game group");
      })
      .catch(err => {
        setIsUserGameJoined(false);
        setMessages(msgs => [...msgs, "JoinUserToGame error: " + err]);
        showToast("JoinUserToGame error: " + (err?.message || err), "error");
        console.error("JoinUserToGame error", err);
      });
  };

  const joinGame = () => {
    if (!gameId) {
      showToast("Please enter a Game ID.", "error");
      return;
    }
    connection?.invoke("JoinGame", Number(gameId))
      .then(() => {
        setIsGameJoined(true);
        setMessages(msgs => [...msgs, "Joined game group"]);
        showToast("Joined game group", "success");
        console.log("Joined game group");
      })
      .catch(err => {
        setIsGameJoined(false);
        setMessages(msgs => [...msgs, "JoinGame error: " + err]);
        showToast("JoinGame error: " + (err?.message || err), "error");
        console.error("JoinGame error", err);
      });
  };

  // Join wallet update channel
  const joinWalletUpdateChannel = () => {
    if (!userId) {
      showToast("Please enter User ID.", "error");
      return;
    }
    connection?.invoke("JoinUserToWalletUpdationChannel", Number(userId))
      .then(() => {
        setMessages(msgs => [...msgs, "Joined wallet update channel"]);
        showToast("Joined wallet update channel", "success");
{/* --- Independent Donations Entity --- */}
<div
  style={{
    margin: "48px auto 32px auto",
    padding: 28,
    background: "#fff",
    border: "3px solid #0050b3",
    borderRadius: 16,
    boxShadow: "0 4px 24px #0050b322",
    maxWidth: 600,
    minWidth: 320,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  }}
>
  <h2 style={{
    color: "#0050b3",
    marginTop: 0,
    marginBottom: 24,
    fontSize: 28,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: 800,
    textAlign: "center"
  }}>
    Donations
  </h2>
  {(() => {
    // Flatten all donations from all drives/plays into a single array
    const allDonations: Array<any & { driveId: number; playId: number }> = [];
    liveGame.forEach((drive) => {
      drive.plays?.forEach((play: PlayDto) => {
        play.donations?.forEach((donation: any) => {
          allDonations.push({
            ...donation,
            driveId: drive.driveId,
            playId: play.id,
            playObj: play,
            driveObj: drive,
          });
        });
      });
    });
    // Reverse so newest donations are at the top (assuming new donations are added last)
    allDonations.reverse();
    if (allDonations.length === 0) {
      return <div style={{ color: "#888", fontSize: 18, marginTop: 16 }}>No donations yet.</div>;
    }
    return allDonations.map((donation, idx) => (
      <div
        key={`donation-${donation.driveId}-${donation.playId}-${donation.id ?? idx}`}
        style={{
          border: "2px solid #52c41a",
          borderRadius: 10,
          background: "#f6ffed",
          padding: 18,
          marginBottom: 18,
          boxShadow: "0 2px 8px #0001",
          maxWidth: 480,
          width: "100%",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: 6, color: "#237804" }}>
          Donation for Play ID: {donation.playId}
        </div>
        <div>
          <strong>Team ID:</strong> {donation.teamId}
        </div>
        <div>
          <strong>Amount:</strong> {donation.amount}
        </div>
        <div>
          <strong>Type:</strong> {donation.type}
        </div>
        <div>
          <strong>Pledge ID:</strong> {donation.pledgeId ?? "N/A"}
        </div>
        <div>
          <strong>Is Funded:</strong>{" "}
          <span style={{ color: donation.isFunded ? "#52c41a" : "#f5222d", fontWeight: "bold" }}>
            {donation.isFunded ? "Yes" : "No"}
          </span>
        </div>
      </div>
    ));
  })()}
</div>
        console.log("Joined wallet update channel");
      })
      .catch(err => {
        setMessages(msgs => [...msgs, "JoinUserToWalletUpdationChannel error: " + err]);
        showToast("JoinUserToWalletUpdationChannel error: " + (err?.message || err), "error");
        console.error("JoinUserToWalletUpdationChannel error", err);
      });
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif", background: "#f7f7f7", minHeight: "100vh" }}>
      {/* Wallet Balance Display */}
      <div style={{ marginBottom: 16, padding: 12, background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 8, display: "inline-block" }}>
        <strong>Wallet Balance:</strong>{" "}
        {walletBalance !== null ? (
          <span style={{ color: "#1890ff", fontWeight: "bold" }}>{walletBalance}</span>
        ) : (
          <span style={{ color: "#888" }}>Not joined / No data</span>
        )}
        <button
          style={{
            marginLeft: 16,
            padding: "4px 12px",
            background: "#1890ff",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: "bold",
          }}
          onClick={joinWalletUpdateChannel}
          disabled={!connection || !userId}
          title={!connection ? "Connect to SignalR first" : !userId ? "Enter User ID" : "Join Wallet Update Channel"}
        >
          Join Wallet Update Channel
        </button>
      </div>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: toast.type === "error" ? "#f44336" : toast.type === "success" ? "#4caf50" : "#2196f3",
            color: "#fff",
            padding: "10px 22px",
            borderRadius: 8,
            boxShadow: "0 2px 12px #0003",
            zIndex: 9999,
            fontWeight: "bold",
            fontSize: 13,
            minWidth: 180,
            textAlign: "center",
            letterSpacing: 0.5,
          }}
        >
          {toast.message}
        </div>
      )}
      <h2>SignalR Test Client</h2>
      <div style={{ marginBottom: 20 }}>
        <label>User ID: </label>
        <input
          type="number"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          min="1"
          inputMode="numeric"
          pattern="[0-9]*"
        />
        <label style={{ marginLeft: 10 }}>Game ID: </label>
        <input
          type="number"
          value={gameId}
          onChange={e => setGameId(e.target.value)}
          min="1"
          inputMode="numeric"
          pattern="[0-9]*"
        />
        <label style={{ marginLeft: 10 }}>Token: </label>
        <input
          type="text"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Paste JWT token here"
          style={{ width: 320, marginLeft: 5 }}
        />
        <button
          onClick={connectToSignalR}
          style={{ marginLeft: 10 }}
          disabled={!!connection}
        >
          Connect
        </button>
        <button
          onClick={joinUserToGame}
          style={{ marginLeft: 10 }}
          disabled={!connection}
        >
          Join User+Game
        </button>
        <span style={{ marginLeft: 8, color: isUserGameJoined ? "#2a3" : "#a33", fontWeight: "bold" }}>
          {isUserGameJoined ? "Joined" : "Not Joined"}
        </span>
        <button
          onClick={leaveUserFromGame}
          style={{ marginLeft: 6 }}
          disabled={!connection || !isUserGameJoined}
        >
          Leave User+Game
        </button>
        <button
          onClick={joinGame}
          style={{ marginLeft: 10 }}
          disabled={!connection}
        >
          Join Game
        </button>
        <span style={{ marginLeft: 8, color: isGameJoined ? "#2a3" : "#a33", fontWeight: "bold" }}>
          {isGameJoined ? "Joined" : "Not Joined"}
        </span>
        <button
          onClick={leaveGame}
          style={{ marginLeft: 6 }}
          disabled={!connection || !isGameJoined}
        >
          Leave Game
        </button>
      </div>
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={joinOpenChannel}
          style={{ marginLeft: 10 }}
          disabled={!connection}
        >
          Join Open Channel (All Live Scores)
        </button>
        <span style={{ marginLeft: 8, color: isOpenChannelJoined ? "#2a3" : "#a33", fontWeight: "bold" }}>
          {isOpenChannelJoined ? "Joined" : "Not Joined"}
        </span>
        <button
          onClick={leaveOpenChannel}
          style={{ marginLeft: 6 }}
          disabled={!connection || !isOpenChannelJoined}
        >
          Leave Open Channel
        </button>
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Live Game Column */}
        <div style={{ flex: 1, minWidth: 340, background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 2px 8px #0001" }}>
          <div style={{ fontWeight: "bold", fontSize: 18, marginBottom: 8 }}>
            Game ID: {gameId} &nbsp; | &nbsp; User ID: {userId}
          </div>
          <div style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8, color: "#2a3" }}>Live Game</div>
          {(!liveGame || liveGame.length === 0) && <div style={{ color: "#888" }}>No live game data received yet.</div>}
          {liveGame && liveGame.map((drive, dIdx) => (
            <div key={dIdx} style={{
              margin: "20px 0",
              border: "1px solid #ddd",
              borderRadius: 8,
              background: "#fafbfc",
              boxShadow: "0 1px 4px #0001",
              padding: 16,
              position: "relative"
            }}>
              {drive.plays && drive.plays.map((play, pIdx) => (
                <div key={pIdx} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 16,
                  border: "1px solid #cce",
                  borderRadius: 6,
                  background: "#eef2fa",
                  padding: 14,
                  boxShadow: "0 1px 2px #0001"
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", fontSize: 16, color: "#2a3" }}>{play.playTypeName}</div>
                    <div style={{ margin: "6px 0", color: "#333" }}>{play.playDescription}</div>
                    <div style={{ color: "#555" }}>
                      <span>Yards: <b>{play.yards ?? "-"}</b></span>
                      <span style={{ marginLeft: 16 }}>Distance: <b>{play.distance ?? "-"}</b></span>
                    </div>
                    <div style={{ marginTop: 6, color: "#888" }}>
                      Start Possession Team ID: <b>{play.startPossessionTeamId ?? "-"}</b>
                    </div>
                    {/* --- Donation & Group Donation Box --- */}
                    {(!!play.donations?.length || !!play.groupDonationToPlayDto?.length) && (
                      <div style={{
                        marginTop: 12,
                        padding: 12,
                        background: "#fffbe6",
                        border: "1px solid #ffe58f",
                        borderRadius: 6,
                        boxShadow: "0 1px 4px #0001"
                      }}>
                        <div style={{ fontWeight: "bold", color: "#b8860b", marginBottom: 4 }}>
                          Play Donations & Groups
                        </div>
                        <div style={{ fontSize: 13, color: "#333" }}>
                          <div><b>Play ID:</b> {play.id}</div>
                          {play.donations && play.donations.length > 0 && (
                            <div style={{ marginTop: 6 }}>
                              <b>Donations:</b>
                              <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                                {play.donations.map((don, idx) => (
                                  <li key={idx}>
                                    {don.donorName ? <b>{don.donorName}</b> : "User"}: ${don.amount}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {play.groupDonationToPlayDto && play.groupDonationToPlayDto.length > 0 && (
                            <div style={{ marginTop: 6 }}>
                              <b>Group Donations:</b>
                              <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                                {play.groupDonationToPlayDto.map((group, idx) => (
                                  <li key={idx}>
                                    <b>{group.groupName}</b> (${group.amount}) - Members: {group.groupMemberCount}
                                    <ul style={{ margin: "2px 0 0 16px", padding: 0 }}>
                                      {group.groupMembers && group.groupMembers.map((member, mIdx) => (
                                        <li key={mIdx}>
                                          {member.userName} (${member.amount})
                                        </li>
                                      ))}
                                    </ul>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", minWidth: 100 }}>
                    <div style={{ fontWeight: "bold", fontSize: 15, color: "#36a" }}>
                      {play.quarter !== undefined && play.quarter !== null
                        ? `Q${play.quarter}`
                        : (drive.quarter !== undefined && drive.quarter !== null
                          ? `Q${drive.quarter}`
                          : "-")}
                    </div>
                    <div style={{ color: "#555" }}>
                      {play.time ?? "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Live Score Column */}
        <div style={{ flex: 1, minWidth: 280, background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 2px 8px #0001" }}>
          <div style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8, color: "#36a" }}>Live Score</div>
          {liveScore ? (
            <div>
              <div>Game ID: <b>{liveScore.gameId}</b></div>
              <div>Home Team ID: <b>{liveScore.homeTeamId}</b></div>
              <div>Away Team ID: <b>{liveScore.awayTeamId}</b></div>
              <div>Home Score: <b>{liveScore.homeTeamScore}</b></div>
              <div>Away Score: <b>{liveScore.awayTeamScore}</b></div>
              <div>Quarter: <b>{liveScore.quarter}</b></div>
              <div>Time: <b>{liveScore.time}</b></div>
              <div>Status: <b>{liveScore.gameStatus}</b></div>
            </div>
          ) : (
            <div style={{ color: "#888" }}>No live score data received yet.</div>
          )}
        </div>
        
        {/* Virtual Field Column */}
        <div style={{ flex: 1, minWidth: 280, background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 2px 8px #0001" }}>
          <div style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8, color: "#a63" }}>Virtual Field</div>
          {virtualField ? (
            <div>
              <div>Game ID: <b>{virtualField.gameId}</b></div>
              <div>Ball On: <b>{virtualField.ballOnAbb} {virtualField.ballOnYards}</b></div>
              <div>First Down Marker: <b>{virtualField.firstDownMarkerAbb} {virtualField.firstDownMarkerYards}</b></div>
              <div>Distance: <b>{virtualField.distance}</b></div>
              <div>Down: <b>{virtualField.down}</b></div>
              <div>Start Possession Team ID: <b>{virtualField.startPossessionTeamId}</b></div>
              <div>Is Opponent: <b>{virtualField.isOpponent ? "Yes" : "No"}</b></div>
            </div>
          ) : (
            <div style={{ color: "#888" }}>No virtual field data received yet.</div>
          )}
        </div>
        {/* Total Donations Column */}
        <div style={{ flex: 1, minWidth: 280, background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 2px 8px #0001" }}>
          <div style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8, color: "#a36" }}>Total Donations</div>
          {totalDonations ? (
            <div>
              <div>Game ID: <b>{totalDonations.gameId}</b></div>
              {totalDonations.totalTeamDonations && totalDonations.totalTeamDonations.map((team: any, idx: number) => (
                <div key={idx}>
                  Team ID: <b>{team.teamId}</b> - Total: <b>{team.totalDonations}</b>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#888" }}>No donations data received yet.</div>
          )}
        </div>
      {/* All Live Games Column */}
      <div style={{ flex: 1, minWidth: 340, background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 2px 8px #0001" }}>
        <div style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8, color: "#c36" }}>All Live Games</div>
        {openChannelScores.length === 0 ? (
          <div style={{ color: "#888" }}>No open channel live games received yet.</div>
        ) : (
          openChannelScores.map((game, idx) => (
            <div key={idx} style={{
              margin: "16px 0",
              border: "1px solid #ddd",
              borderRadius: 8,
              background: "#fafbfc",
              boxShadow: "0 1px 4px #0001",
              padding: 12,
              position: "relative"
            }}>
              {/* Try to render common fields, fallback to JSON */}
              {game && typeof game === "object" ? (
                <>
                  <div>Game ID: <b>{game.gameId ?? "-"}</b></div>
                  <div>Home Team ID: <b>{game.homeTeamId ?? "-"}</b></div>
                  <div>Away Team ID: <b>{game.awayTeamId ?? "-"}</b></div>
                  <div>Home Score: <b>{game.homeTeamScore ?? "-"}</b></div>
                  <div>Away Score: <b>{game.awayTeamScore ?? "-"}</b></div>
                  <div>Quarter: <b>{game.quarter ?? "-"}</b></div>
                  <div>Status: <b>{game.gameStatus ?? "-"}</b></div>
                  <div>Time: <b>{game.time ?? "-"}</b></div>
                </>
              ) : (
                <pre style={{ fontSize: 12, color: "#333" }}>{JSON.stringify(game, null, 2)}</pre>
              )}
            </div>
          ))
        )}
      </div>
      </div>
      <div style={{ marginTop: 20 }}>
        <h4>Raw Messages:</h4>
        <div style={{ maxHeight: 300, overflowY: "auto", background: "#eee", padding: 10 }}>
          {messages.map((msg, idx) => (
            <div key={idx}>{msg}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
