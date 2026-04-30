import { EnvHttpProxyAgent } from 'undici';

let _agent: EnvHttpProxyAgent | undefined;

export function getProxyDispatcher(): { dispatcher?: EnvHttpProxyAgent } {
  if (!_agent) {
    _agent = new EnvHttpProxyAgent();
  }
  return { dispatcher: _agent };
}
