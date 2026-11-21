// The only module that touches the network layer. Today it only listens to the connection state
// for the Offline/Online label. Reachability probing is turned off, so NetInfo itself sends no requests.
import NetInfo from "@react-native-community/netinfo";

let configured = false;

export function watchConnection(onChange: (online: boolean) => void): () => void {
  if (!configured) {
    NetInfo.configure({ reachabilityShouldRun: () => false });
    configured = true;
  }
  return NetInfo.addEventListener((state) => onChange(state.isConnected === true));
}
