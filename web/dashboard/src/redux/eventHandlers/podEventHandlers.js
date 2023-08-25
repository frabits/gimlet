export function podCreated(state, event) {
  const env = event.env;
  const namespace = event.subject.split('/')[0];
  const podName = event.subject.split('/')[1];

  if (state.connectedAgents[env] === undefined) {
    return state;
  }

  state.connectedAgents[env].stacks.forEach((stack, stackID, stacks) => {
    if (stack.service.namespace + '/' + stack.service.name !== event.svc) {
      return;
    }
    if (!stack.deployment) {
      return;
    }
    if (stack.deployment.namespace + '/' + stack.deployment.name !== event.deployment) {
      return;
    }

    if (!deploymentHasPod(stack.deployment, event.subject)) {
      if (!stack.deployment.pods) {
        stack.deployment.pods = [];
      }
      stack.deployment.pods.push({
        name: podName,
        namespace: namespace,
        status: event.status
      });
    }
  });

  return state
}

export function podUpdated(state, event) {
  const env = event.env;
  const namespace = event.subject.split('/')[0];
  const podName = event.subject.split('/')[1];

  if (state.connectedAgents[env] === undefined) {
    return state;
  }

  state.connectedAgents[env].stacks.forEach((stack, stackID, stacks) => {
    if (!stack.deployment) {
      return state;
    }
    stack.deployment.pods.forEach((pod, podID) => {
      if (pod.namespace + '/' + pod.name === event.subject) {
        stacks[stackID].deployment.pods[podID] = {
          name: podName,
          namespace: namespace,
          status: event.status,
          errorCause: event.errorCause,
          logs: event.logs
        };
      }
    });
  });
  return state;
}

export function podDeleted(state, event) {
  const env = event.env;

  if (state.connectedAgents[env] === undefined) {
    return state;
  }

  state.connectedAgents[env].stacks.forEach((stack, stackID, stacks) => {
    let toRemove = undefined;
    if (!stack.deployment) {
      // happens when a deployment is deleted
      // deploymentDeleted event may arrive faster than podDeleted
      return
    }
    stack.deployment.pods.forEach((pod, podID) => {
      if (pod.namespace + '/' + pod.name === event.subject) {
        toRemove = podID;
      }
    });
    if (toRemove !== undefined) {
      stack.deployment.pods.splice(toRemove, 1);
    }
  });

  return state;
}

export function podLogs(state, event) {
  assignContainerTextColors(state, event)

  if (!state.podLogs[event.pod]) {
    state.podLogs[event.pod] = [];
  }

  const line = {
    color: state.textColors[event.container],
    timestamp: new Date(event.timestamp),
    content: `[${event.container}] ${event.message}`
  };
  state.podLogs[event.pod].push(line);
  state.podLogs[event.pod].sort((a, b) => a.timestamp - b.timestamp);

  return state;
}

function assignContainerTextColors(state, event) {
  const textColors = ["text-red-200", "text-purple-200", "text-green-200", "text-blue-200", "text-yellow-200", "text-orange-200"];

  if (!state.textColors[event.container]) {
    const availableColors = textColors.filter(color => !Object.values(state.textColors).includes(color));
    if (availableColors.length > 0) {
      state.textColors[event.container] = availableColors[0];
    } else {
      state.textColors[event.container] = state.textColors[Object.keys(state.textColors)[0]];
    }
  }
}

export function clearPodLogs(state, payload) {
  state.podLogs[payload.pod] = [];
  return state;
}

function deploymentHasPod(deployment, podName) {
  if (deployment.pods === undefined) {
    return false;
  }

  for (let pod of deployment.pods) {
    if (pod.name === podName) {
      return true;
    }
  }

  return false;
}
