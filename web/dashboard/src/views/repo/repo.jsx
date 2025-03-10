import React, { Component } from 'react';
import { Spinner } from '../repositories/repositories';
import {
  ACTION_TYPE_BRANCHES,
  ACTION_TYPE_ENVCONFIGS,
  ACTION_TYPE_COMMITS,
  ACTION_TYPE_DEPLOY,
  ACTION_TYPE_DEPLOY_STATUS,
  ACTION_TYPE_REPO_METAS,
  ACTION_TYPE_ROLLOUT_HISTORY,
  ACTION_TYPE_REPO_PULLREQUESTS,
  ACTION_TYPE_RELEASE_STATUSES,
} from "../../redux/redux";
import Commits from "../../components/commits/commits";
import Dropdown from "../../components/dropdown/dropdown";
import { Env } from '../../components/env/env';
import TenantSelector from './tenantSelector';
import RefreshButton from '../../components/refreshButton/refreshButton';

export default class Repo extends Component {
  constructor(props) {
    super(props);
    const { owner, repo } = this.props.match.params;
    const repoName = `${owner}/${repo}`;

    const queryParams = new URLSearchParams(this.props.location.search)

    // default state
    let reduxState = this.props.store.getState();
    this.state = {
      connectedAgents: reduxState.connectedAgents,
      search: reduxState.search,
      rolloutHistory: reduxState.rolloutHistory,
      commits: reduxState.commits,
      branches: reduxState.branches,
      envConfigs: reduxState.envConfigs[repoName],
      selectedBranch: queryParams.get("branch") ?? '',
      selectedTenant: queryParams.get("tenant") ?? '',
      settings: reduxState.settings,
      refreshQueue: reduxState.repoRefreshQueue.filter(repo => repo === repoName).length,
      agents: reduxState.settings.agents,
      envs: reduxState.envs,
      repoMetas: reduxState.repoMetas,
      fileInfos: reduxState.fileInfos,
      pullRequests: reduxState.pullRequests.configChanges[repoName],
      runningDeploys: reduxState.runningDeploys,
      trackedDeploys: [],
      alerts: reduxState.alerts,
    }

    // handling API and streaming state changes
    this.props.store.subscribe(() => {
      let reduxState = this.props.store.getState();

      this.setState({
        connectedAgents: reduxState.connectedAgents,
        search: reduxState.search,
        rolloutHistory: reduxState.rolloutHistory,
        commits: reduxState.commits,
        branches: reduxState.branches,
        envConfigs: reduxState.envConfigs[repoName],
        envs: reduxState.envs,
        repoMetas: reduxState.repoMetas,
        fileInfos: reduxState.fileInfos,
        pullRequests: reduxState.pullRequests.configChanges[repoName],
        scmUrl: reduxState.settings.scmUrl,
        alerts: reduxState.alerts,
      });

      const queueLength = reduxState.repoRefreshQueue.filter(r => r === repoName).length
      this.setState(prevState => {
        if (prevState.refreshQueueLength !== queueLength) {
          this.refreshBranches(owner, repo);
          this.refreshCommits(owner, repo, prevState.selectedBranch);
          this.refreshConfigs(owner, repo);
        }
        return { refreshQueueLength: queueLength }
      });
      this.setState({ agents: reduxState.settings.agents });

      this.setState(prevState => {
        let trackedDeploys = []
        reduxState.runningDeploys.forEach(runningDeploy => {
          if (!runningDeploy.trackingId) {
            return
          }
          if (!prevState.trackedDeploys.includes(runningDeploy.trackingId)) {
            setTimeout(() => {
              this.checkDeployStatus(runningDeploy.trackingId);
            }, 500);
          }

          trackedDeploys.push(runningDeploy.trackingId)
        });

        return {
          trackedDeploys: trackedDeploys
        }
      });
    });

    this.branchChange = this.branchChange.bind(this)
    this.deploy = this.deploy.bind(this)
    this.rollback = this.rollback.bind(this)
    this.checkDeployStatus = this.checkDeployStatus.bind(this)
    this.navigateToConfigEdit = this.navigateToConfigEdit.bind(this)
    this.linkToDeployment = this.linkToDeployment.bind(this)
    this.newConfig = this.newConfig.bind(this)
    this.setSelectedTenant = this.setSelectedTenant.bind(this)
    this.refreshCommits = this.refreshCommits.bind(this)
  }

  componentDidMount() {
    const { owner, repo } = this.props.match.params;

    this.props.gimletClient.getRepoMetas(owner, repo)
      .then(data => {
        this.props.store.dispatch({
          type: ACTION_TYPE_REPO_METAS, payload: {
            repoMetas: data,
          }
        });
      }, () => {/* Generic error handler deals with it */
    });

    this.getPullRequests(owner, repo)

    this.props.gimletClient.getEnvConfigs(owner, repo)
      .then(envConfigs => {
        this.props.store.dispatch({
          type: ACTION_TYPE_ENVCONFIGS, payload: {
            owner: owner,
            repo: repo,
            envConfigs: envConfigs
          }
        });
      }, () => {/* Generic error handler deals with it */
    });

    this.props.gimletClient.getBranches(owner, repo)
      .then(data => {
        let defaultBranch = 'main'
        for (let branch of data) {
          if (branch === "master") {
            defaultBranch = "master";
          }
        }

        if (this.state.selectedBranch === "") this.branchChange(defaultBranch)
        return data;
      })
      .then(data => {
        this.props.store.dispatch({
          type: ACTION_TYPE_BRANCHES, payload: {
            owner: owner,
            repo: repo,
            branches: data
          }
        });
      }, () => {/* Generic error handler deals with it */
    });
  }

  refreshBranches(owner, repo) {
    this.props.gimletClient.getBranches(owner, repo)
      .then(data => {
        this.props.store.dispatch({
          type: ACTION_TYPE_BRANCHES, payload: {
            owner: owner,
            repo: repo,
            branches: data
          }
        });
      }, () => {/* Generic error handler deals with it */
      });
  }

  refreshCommits(owner, repo, branch) {
    this.props.gimletClient.getCommits(owner, repo, branch, "head")
      .then(data => {
        this.props.store.dispatch({
          type: ACTION_TYPE_COMMITS, payload: {
            owner: owner,
            repo: repo,
            commits: data
          }
        });
      }, () => {/* Generic error handler deals with it */
      });
  }

  refreshConfigs(owner, repo) {
    this.props.gimletClient.getEnvConfigs(owner, repo)
      .then(envConfigs => {
        this.props.store.dispatch({
          type: ACTION_TYPE_ENVCONFIGS, payload: {
            owner: owner,
            repo: repo,
            envConfigs: envConfigs
          }
        });
      }, () => {/* Generic error handler deals with it */
      });
  }

  branchChange(newBranch) {
    if (newBranch === '') {
      return
    }

    const { owner, repo } = this.props.match.params;
    const { selectedBranch } = this.state;

    if (newBranch !== selectedBranch) {
      this.setState({ selectedBranch: newBranch });

      this.props.gimletClient.getCommits(owner, repo, newBranch, "head")
        .then(data => {
          this.props.store.dispatch({
            type: ACTION_TYPE_COMMITS, payload: {
              owner: owner,
              repo: repo,
              commits: data
            }
          });
        }, () => {/* Generic error handler deals with it */
        });
    }
  }

  checkDeployStatus(trackingId) {
    const { owner, repo } = this.props.match.params;

    this.props.gimletClient.getDeployStatus(trackingId)
      .then(data => {
        this.props.store.dispatch({
          type: ACTION_TYPE_DEPLOY_STATUS, payload: {
            trackingId:  trackingId,
            status: data.status,
            statusDesc: data.statusDesc,
            results: data.results,
          }
        });

        if (data.status === "new") {
          setTimeout(() => {
            this.checkDeployStatus(trackingId);
          }, 500);
        }

        if (data.status === "processed") {
          let gitopsCommitsApplied = true;
          const numberOfResults = data.results.length;

          if (numberOfResults > 0) {
            const latestGitopsHashMetadata = data.results[0];
            if (latestGitopsHashMetadata.gitopsCommitStatus === "N/A") { // poll until all gitops writes are applied
              gitopsCommitsApplied = false;
              setTimeout(() => {
                this.checkDeployStatus(trackingId);
              }, 500);
            }
          }
          if (gitopsCommitsApplied) {
            for (const result of data.results) {
              setTimeout(() => {
                this.props.gimletClient.getRolloutHistoryPerApp(owner, repo, result.env, result.app)
                .then(data => {
                    this.props.store.dispatch({
                      type: ACTION_TYPE_ROLLOUT_HISTORY, payload: {
                        owner: owner,
                        repo: repo,
                        env: result.env,
                        app: result.app,
                        releases: data,
                      }
                    });
                  }, () => {/* Generic error handler deals with it */ }
                  );

                this.props.gimletClient.getReleases(result.env, 10)
                  .then(data => {
                    this.props.store.dispatch({
                      type: ACTION_TYPE_RELEASE_STATUSES,
                      payload: {
                        envName: result.env,
                        data: data,
                      }
                    });
                  }, () => {/* Generic error handler deals with it */
                  })
                }, 300);
            }
          }
        }

        if (data.type === "imageBuild" && data.status === "success") {
          const triggeredReleaseId = data.results[0].triggeredDeployRequestID
          this.props.store.dispatch({
            type: ACTION_TYPE_DEPLOY_STATUS, payload: {
              imageBuildTrackingId: trackingId,
            }
          });
          this.checkDeployStatus(triggeredReleaseId);
        }

      }, () => {/* Generic error handler deals with it */
      });
  }

  deploy(target, sha, repo) {
    this.props.gimletClient.deploy(target.artifactId, target.env, target.app, this.state.selectedTenant)
      .then(data => {
        target.sha = sha;
        target.trackingId = data.id;
        target.repo = repo;
        target.type = data.type;
        this.props.store.dispatch({
          type: ACTION_TYPE_DEPLOY, payload: target
        });
        setTimeout(() => {
          this.checkDeployStatus(target.trackingId);
        }, 500);
      }, () => {/* Generic error handler deals with it */
      });
  }

  triggerCommitSync(owner, repo) {
    this.props.gimletClient.triggerCommitSync(owner, repo)
  }

  getPullRequests(owner, repo) {
    this.props.gimletClient.getPullRequests(owner, repo)
      .then(data => {
        this.props.store.dispatch({
          type: ACTION_TYPE_REPO_PULLREQUESTS, payload: {
            data: data,
            repoName: `${owner}/${repo}`
          }
        });
      }, () => {/* Generic error handler deals with it */
      });
  }

  rollback(env, app, rollbackTo, e) {
    const target = {
      rollback: true,
      app: app,
      env: env,
    };
    this.props.gimletClient.rollback(env, app, rollbackTo)
      .then(data => {
        target.trackingId = data.id;
        target.type = data.type;
        setTimeout(() => {
          this.checkDeployStatus(target);
        }, 500);
      }, () => {/* Generic error handler deals with it */
      });

    this.props.store.dispatch({
      type: ACTION_TYPE_DEPLOY, payload: target
    });
  }

  navigateToConfigEdit(env, config) {
    const { owner, repo } = this.props.match.params;
    this.props.history.push(encodeURI(`/repo/${owner}/${repo}/envs/${env}/config/${config}`));
  }

  linkToDeployment(env, deployment) {
    const { owner, repo } = this.props.match.params;
    this.props.history.push({
      pathname: `/repo/${owner}/${repo}/${env}/${deployment}`,
      search: this.props.location.search
    })
  }

  newConfig(env, config) {
    const { owner, repo } = this.props.match.params;
    this.props.history.push(encodeURI(`/repo/${owner}/${repo}/envs/${env}/config/${config}/new`));
  }

  ciConfigAndShipperStatuses(repoName) {
    const { repoMetas } = this.state;
    const shipper = repoMetas.githubActionsShipper || repoMetas.circleCiShipper
    let shipperColor = "text-gray-500";
    let ciConfigColor = "text-gray-500";
    let ciConfig = "";

    if (repoMetas.githubActions) {
      ciConfigColor = "text-green-500";
      ciConfig = ".github/workflows"
    } else if (repoMetas.circleCi) {
      ciConfigColor = "text-green-500";
      ciConfig = ".circleci"
    }
    if (shipper) {
      shipperColor = "text-green-500";
    }

    return (
      <>
        <span title={repoMetas.githubActions || repoMetas.circleCi ? "This repository has CI config" : "This repository doesn't have CI config"}>
          <a href={`${this.state.scmUrl}/${repoName}/tree/main/${ciConfig}`} target="_blank" rel="noopener noreferrer" className={(!repoMetas.githubActions && !repoMetas.circleCi) ? "cursor-default pointer-events-none" : ""}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`inline ml-1 h-4 w-4 ${ciConfigColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </a>
        </span>
        <span title={shipper ? "This repository has shipper" : "This repository doesn't have shipper"}>
          <a href={`${this.state.scmUrl}/${repoName}/tree/main/${ciConfig}/${shipper}`} target="_blank" rel="noopener noreferrer" className={(!repoMetas.githubActionsShipper && !repoMetas.circleCiShipper) ? "cursor-default pointer-events-none" : ""}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`inline ml-1 h-4 w-4 ${shipperColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />          </svg>
          </a>
        </span>
      </>)
  }

  fileMetasByEnv(envName) {
    return this.state.fileInfos.filter(fileInfo => fileInfo.envName === envName)
  }

  setSelectedTenant(tenant) {
    this.setState({ selectedTenant: tenant });
    const queryParam = tenant === "" ? tenant : `?tenant=${tenant}`

    this.props.history.push({
      pathname: this.props.location.pathname,
      search: queryParam
    })
  }

  tenantsFromConfigs(envConfigs) {
    let tenants = [];

    if (!envConfigs) {
      return tenants;
    }

    for (const configs of Object.values(envConfigs)) {
      configs.forEach(config => {
        const tenantName = config.tenant.name;
        if (tenantName && !tenants.includes(tenantName)) {
          tenants.push(tenantName);
        }
      });
    }
    return tenants;
  }

  filteredConfigsByTenant(envConfigs, selectedTenant) {
    if (!envConfigs || !selectedTenant) {
      return envConfigs;
    }

    const filteredEnvs = envConfigs.filter(envConfig => envConfig.tenant.name === selectedTenant);

    if (filteredEnvs.length === 0) {
      return undefined;
    }

    return filteredEnvs;
  }

  render() {
    const { owner, repo, environment, deployment } = this.props.match.params;
    const repoName = `${owner}/${repo}`
    let { envs, connectedAgents, search, rolloutHistory, commits, pullRequests, settings } = this.state;
    const { branches, selectedBranch, envConfigs, scmUrl, alerts } = this.state;

    let filteredEnvs = envsForRepoFilteredBySearchFilter(envs, connectedAgents, repoName, search.filter);

    let repoRolloutHistory = undefined;
    if (rolloutHistory && rolloutHistory[repoName]) {
      repoRolloutHistory = rolloutHistory[repoName]
    }

    return (
      <div>
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className='flex-1'>
              <div className="flex justify-between">
                <h1 className="text-3xl font-bold leading-tight text-gray-900">{repoName}
                  <a href={`${scmUrl}/${owner}/${repo}`} target="_blank" rel="noopener noreferrer">
                    <svg xmlns="http://www.w3.org/2000/svg"
                      className="inline fill-current text-gray-500 hover:text-gray-700 ml-1 h-4 w-4"
                      viewBox="0 0 24 24">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <path
                        d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                    </svg>
                  </a>
                  {/* {this.ciConfigAndShipperStatuses(repoName)} */}
                </h1>
                <RefreshButton
                  refreshFunc={() => {
                    this.triggerCommitSync(owner, repo);
                    this.getPullRequests(owner, repo);
                  }}
                />
              </div>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => this.props.history.push("/repositories")}>
                &laquo; back
              </button>
            </div>
            <TenantSelector
              tenants={this.tenantsFromConfigs(envConfigs)}
              selectedTenant={this.state.selectedTenant}
              setSelectedTenant={this.setSelectedTenant}
            />
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              <div>
                {envConfigs && Object.keys(filteredEnvs).sort().map((envName) =>
                  <Env
                    key={envName}
                    env={filteredEnvs[envName]}
                    repoRolloutHistory={repoRolloutHistory}
                    envConfigs={this.filteredConfigsByTenant(envConfigs[envName], this.state.selectedTenant)}
                    navigateToConfigEdit={this.navigateToConfigEdit}
                    linkToDeployment={this.linkToDeployment}
                    newConfig={this.newConfig}
                    rollback={this.rollback}
                    owner={owner}
                    repoName={repo}
                    fileInfos={this.fileMetasByEnv(envName)}
                    pullRequests={pullRequests?.[envName]}
                    releaseHistorySinceDays={settings.releaseHistorySinceDays}
                    gimletClient={this.props.gimletClient}
                    store={this.props.store}
                    envFromParams={environment}
                    deploymentFromParams={deployment}
                    scmUrl={scmUrl}
                    history={this.props.history}
                    alerts={alerts}
                  />
                )
                }

                {Object.keys(branches).length !== 0 &&
                  <div className="bg-gray-50 shadow p-4 sm:p-6 lg:p-8 mt-8 relative">
                    <div className="w-64 mb-4 lg:mb-8">
                      <Dropdown
                        items={branches[repoName]}
                        value={selectedBranch}
                        changeHandler={(newBranch) => this.branchChange(newBranch)}
                      />
                    </div>
                    {commits &&
                      <Commits
                        commits={commits[repoName]}
                        envs={envs}
                        connectedAgents={filteredEnvs}
                        deployHandler={this.deploy}
                        repo={repo}
                        gimletClient={this.props.gimletClient}
                        store={this.props.store}
                        owner={owner}
                        branch={this.state.selectedBranch}
                        scmUrl={scmUrl}
                        tenant={this.state.selectedTenant}
                        envConfigs={envConfigs}
                      />
                    }
                  </div>}
                {(!envConfigs || !commits) && <Spinner />}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }
}

/*
  Takes all envs from Kubernetes
  and finds the relevant stacks for the repo for each environment
  then filters the relevant stacks further with the search box filter
*/
function stacks(connectedAgents, envName) {
  for (const agentName of Object.keys(connectedAgents)) {
    const agent = connectedAgents[agentName];
    if (agentName === envName) {
      return agent.stacks;
    }
  }
  return [];
}

function envsForRepoFilteredBySearchFilter(envs, connectedAgents, repoName, searchFilter) {
  let filteredEnvs = {};

  if (!connectedAgents || !envs) {
    return filteredEnvs;
  }
  
  // iterate through all Kubernetes envs
  for (const env of envs) {
    filteredEnvs[env.name] = {
      name: env.name,
      builtIn: env.builtIn,
      isOnline: isOnline(connectedAgents, env)
    };

    // find all stacks that belong to this repo
    filteredEnvs[env.name].stacks = stacks(connectedAgents, env.name).filter((service) => {
      return service.repo === repoName
    });

    // apply search box filter
    if (searchFilter !== '') {
      filteredEnvs[env.name].stacks = filteredEnvs[env.name].stacks.filter((service) => {
        return service.service.name.includes(searchFilter) ||
          (service.deployment !== undefined && service.deployment.name.includes(searchFilter)) ||
          (service.ingresses !== undefined && service.ingresses.filter((ingress) => ingress.url.includes(searchFilter)).length > 0)
      })
    }
  }

  return filteredEnvs;
}

function isOnline(onlineEnvs, singleEnv) {
  return Object.keys(onlineEnvs)
      .map(env => onlineEnvs[env])
      .some(onlineEnv => {
          return onlineEnv.name === singleEnv.name
      })
};
