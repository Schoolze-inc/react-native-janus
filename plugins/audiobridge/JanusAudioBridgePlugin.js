
import JanusPlugin from "./../../utils/JanusPlugin";
import Janus from "./../../Janus";
import JanusAudioBridgeParticipant from "./AudioBridgeParticipant";


export default class JanusAudioBridgePulgin extends JanusPlugin {
  /**
   * Array of audio bridge participants
   * @type {JanusAudioBridgeParticipant[]}
   */
  participants = null;

  /**
   *
   * @callback onParticipantsListener
   * @param {JanusAudioBridgeParticipant[]} participants
   */
  /**
   *
   * @type {onPublishersListener}
   */
  onPublishersListener = null;
  /**
   *
   * @callback onParticipantLeftListener
   * @param {number} participantID
   */
  /**
   *
   * @type {onParticipantLeftListener}
   */
  onParticipantLeftListener = null;
  /**
   *
   * @param {Janus} janus
   */
  /**
   *
   * @callback onParticipantJoinedListener
   * @param {onParticipantJoinedListener} participant
   */
  /**
   *
   * @type {onParticipantJoinedListener}
   */
  onParticipantJoinedListener = null;

  onConnectedUserListner = null;
  onGetParticpants = null;
  onNewuserJoin = null;
  onUserLeave = null;
  onRoomevents = null; 
  
  constructor(janus) {
    super("janus.plugin.audiobridge", janus);

    this.userID = null;
    this.participants = null;

    this.roomID = null;
    this.displayName = null;
    this.stream = null;

    this.isRemoteDescriptionSet = false;
  }

  getUserID = () => this.userID;

  /**
   *
   * @param {Number} roomID
   */
  setRoomID = (roomID) => {
    this.roomID = roomID;
  };

  /**
   *
   * @param {String} displayName
   */
  setDisplayName = (displayName) => {
    this.displayName = displayName;
  };

  /**
   *
   * @param listener {onParticipantsListener}
   */
  setOnParticipantsListener = (listener) => {
    this.onParticipantsListener = listener;
  };
  /**
   *
   * @param listener {onParticipantJoinedListener}
   */
  setOnParticipantJoinedListener = (listener) => {
    this.onParticipantJoinedListener = listener;
  };

  onGetRoomPaticipants = (response) => {
    this.onGetParticpants(response);
  };

  onNewUserJoinRoom = (response) => {
    this.onNewuserJoin(response);
  };

  onUserLeveRoom = (response) =>{
    this.onUserLeave(response);
 };
 onRoomeventsOccur = (response) => {
    this.onRoomevents(response);
 };

  onConnectedListner = (response)=>{
     this.onConnectedUserListner(response);
  }

  /**
   *
   * @param listener {onParticipantLeftListener}
   */
  setOnParticipantLeftListener = (listener) => {
    this.onParticipantLeftListener = listener;
  };


  onMessage = async (message) => {
    switch (message.janus) {
      case "webrtcup": {
        this.isWebRtcUp = true;
        if (
          this.onWebRTCUpListener &&
          typeof this.onWebRTCUpListener === "function"
        ) {
          this.onWebRTCUpListener();
        }
        return;
      }

      case "media": {
        if (message.type === "audio") {
          this.isReceivingAudio = message.receiving;
          this.onConnectedListner(message);
          // console.log(
          //   "plugin",
          //   (message.receiving ? "" : "not ") + "receiving audio now..."
          // );
        } else if (message.type === "video") {
          this.isReceivingVideo = message.receiving;
       
        }
        return;
      }

      case "trickle": {
        if (this.isRemoteDescriptionSet) {
          await this.pc.addIceCandidate(
            new Janus.RTCIceCandidate({
              candidate: message.candidate.candidate,
              sdpMid: message.candidate.sdpMid,
              sdpMLineIndex: message.candidate.sdpMLineIndex,
            })
          );
        }

        this.cachedCandidates.push(
          new Janus.RTCIceCandidate({
            candidate: message.candidate.candidate,
            sdpMid: message.candidate.sdpMid,
            sdpMLineIndex: message.candidate.sdpMLineIndex,
          })
        );

        return;
      }

      case "hangup": {
        message.reason;
        console.log("plugin", "hangup", message.reason);
        return;
      }

      case "detached": {
        return;
      }

      case "slowlink": {
        return;
      }

      case "event": {
        const data = message.plugindata.data;
        if (data.audiobridge === "event") {
          if (data.room === this.roomID) {
            if (typeof data["leaving"] !== "undefined") {
              let leavingParticipantID = data["leaving"];
               this.onUserLeveRoom(leavingParticipantID);
              return;
            }else{
                this.onRoomeventsOccur(data.participants);
            }
            // else if (typeof data["publishers"] !== "undefined") {
            //   let newParticipants = data["participants"].map(
            //     (participantsrData) =>{
            //       console.log(participantsrData);
            //       new JanusAudioBridgeParticipant(participantsrData)

            //     }
            //   );
            //   for (let i = 0; i < newParticipants.length; i++) {
            //     if (
            //       this.onParticipantJoinedListener != null &&
            //       typeof this.onParticipantJoinedListener === "function"
            //     ) {
            //       this.onParticipantJoinedListener(newParticipants[i]);
            //     }
            //   }
            //   return;
            // }
          }
        }else if(data.audiobridge === "joined"){
              this.onNewUserJoinRoom(data.participants);
        }

        // console.log("plugin", "event", data);
        return;
      }
    }
  };

  /**
   *
   * @returns {Promise<void>}
   */
  join = async (roomid,user_id,muted) => {
    try {
      let joinResponse = await this.sendAsync({
        request: "join",
        room: roomid,
        id:user_id,
        display: this.displayName,
        muted: muted,
      });
      this.setRoomID(roomid);
      if (
        joinResponse.janus === "event" &&
        joinResponse.plugindata &&
        joinResponse.plugindata.data
      ) {
        // console.log(joinResponse,"Response");
        let data = joinResponse.plugindata.data;
        if (data.audiobridge === "joined") {
          this.userID = data.id;
          this.onGetRoomPaticipants(data);
          this.participants = data.participants.map(
            (participantsrData) =>
              new JanusAudioBridgeParticipant(participantsrData)
          );

          // if (
          //   this.onParticipantsListener != null &&
          //   typeof this.onParticipantsListener === "function"
          // ) {
          //   this.onParticipantsListener(this.participants);
          // }

          return;
        } else {
          console.error("join", joinResponse);
        }
      } else {
        console.error("join", joinResponse);
      }
    } catch (e) {
      console.error("join", e);
    }
  };

  /**
   *
   * @param {Janus.MediaStream} stream
   * @returns {Promise<void>}
   */
  mute = async(value) => {
    try{
      let response = await this.sendAsyncWithJsep(
        {
          request: "configure",
          muted: value,
        },
      );
      // console.log("mute response", response);
    }catch(e){
      console.log(e);
    }
  }


  configure = async (stream,muted) => {
    // console.log("here")
    try {
      // console.log("joined to room.");
      // console.log(stream);
      this.pc.addStream(stream);  

      let offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });

      await this.pc.setLocalDescription(offer);

      // offer.sdp = offer.sdp.replace(/a=extmap:(\d+) urn:3gpp:video-orientation\n?/, '');
      // console.log(offer);
      let response = await this.sendAsyncWithJsep(
        {
          request: "configure",
          muted: muted,
          // recording preferences
          record: false,
          // filename: "recording.wav",
        },
        {
          type: offer.type,
          sdp: offer.sdp,
        }
      );
      // console.log("response", response);

      await this.pc.setRemoteDescription(
        new Janus.RTCSessionDescription({
          sdp: response.jsep.sdp,
          type: response.jsep.type,
        })
      );
      this.isRemoteDescriptionSet = true;

      for (const candidate of this.cachedCandidates) {
        await this.pc.addIceCandidate(candidate);
      }
      this.cachedCandidates = [];
    } catch (e) {
      console.log(e);
    }
  };

  detach = async () => {
    try {
      let additionalConfig = {};

      if (this.janus.apiSecret) {
        additionalConfig["apisecret"] = this.janus.apiSecret;
      }

      const hangupResponse = await this.janus.socket.sendAsync({
        janus: "hangup",
        session_id: this.janus.socket.sessionID,
        handle_id: this.handleID,
        ...additionalConfig,
      });

      if (hangupResponse.janus === "success") {
      }

      const detachResponse = await this.detach();

      if (detachResponse.janus === "success") {
      }

      this.pc.close();
      this.janus.detach();
      this.janus.socket.disconnect();
      this.janus.socket.detachPlugin(this);

      console.error("detach", "hangupResponse", hangupResponse);
      console.error("detach", "detachResponse", detachResponse);
    } catch (e) {
      console.error("detach", e);
    }
  };

  get_participants = async() => {
    try{
      // console.log("im called");
      let createResponse = await this.sendAsync({
        request: "listparticipants",
        room: 1234,
      });
      console.log(createResponse);
    }catch(e){
      console.log(e);
    }
  }

  create = async (room,title) => {
    try {
      // console.log("room",room);
      console.log(room);
      let createResponse = await this.sendAsync({
        request: "create",
        room: room,
        description: title,
        audiolevel_event:true,
        record: false,
      });
      this.setRoomID(room);
      
      // todo finish response handling
      console.log("create respone", createResponse);
      return;
    } catch (e) {
      console.log("create", e);
    }
  };
}
