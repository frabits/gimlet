// Copyright 2019 Laszlo Fogas
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package sql

const Dummy = "dummy"
const SelectUserByLogin = "select-user-by-login"
const SelectEverytingFromUsers = "select-everything-from-users"
const SelectAllUser = "select-all-user"
const DeleteUser = "deleteUser"
const SelectCommitsByRepo = "select-commits-by-repo"
const SelectKeyValue = "select-key-value"
const SelectEnvironments = "select-environments"
const SelectEnvironment = "select-environment"
const DeleteEnvironment = "delete-environment"
const SelectPodByName = "select-pod-by-name"
const DeletePodByName = "delete-pod-by-name"
const SelectUnprocessedEvents = "select-unprocessed-events"
const UpdateEventStatus = "update-event-status"
const SelectGitopsCommitBySha = "select-gitops-commit-by-sha"
const SelectGitopsCommits = "select-gitops-commits"
const SelectKubeEventByName = "select-kube-event-by-name"
const DeleteKubeEventByName = "delete-kube-event-by-name"
const SelectAlerts = "select-alerts"
const SelectAlertsByState = "select-alerts-by-state"
const SelectAlertsByName = "select-alerts-by-name"
const SelectAlertsByDeploymentName = "select-alerts-by-deployment-name"
const UpdateAlertStatusFired = "update-alert-status-fired"
const UpdateAlertStatusResolved = "update-alert-status-resolved"

var queries = map[string]map[string]string{
	"sqlite": {
		Dummy: `
SELECT 1;
`,
		SelectUserByLogin: `
SELECT id, login, secret, admin, name, email, access_token, refresh_token, expires, secret, repos, favorite_repos, favorite_services
FROM users
WHERE login = $1;
`,
		SelectAllUser: `
SELECT id, login, secret, admin
FROM users;
`,
		SelectEverytingFromUsers: `
SELECT id, login, admin, name, email, access_token, refresh_token, expires, secret, repos, favorite_repos, favorite_services
FROM users;
`,
		DeleteUser: `
DELETE FROM users where login = $1;
`,
		SelectCommitsByRepo: `
SELECT id, repo, sha, url, author, author_pic, message, created, tags, status
FROM commits
WHERE repo = $1
LIMIT 20;
`,
		SelectKeyValue: `
SELECT id, key, value
FROM key_values
WHERE key = $1;
`,
		SelectEnvironments: `
SELECT id, name, infra_repo, apps_repo, repo_per_env, kustomization_per_app, built_in
FROM environments
ORDER BY name asc;
`,
		SelectEnvironment: `
SELECT id, name, infra_repo, apps_repo, repo_per_env, kustomization_per_app, built_in
FROM environments
WHERE name = $1;
`,
		DeleteEnvironment: `
DELETE FROM environments
WHERE name = ?;
`,
		SelectPodByName: `
SELECT id, name, status, status_desc
FROM pods
WHERE name = $1;
`,
		DeletePodByName: `
DELETE FROM pods where name = $1;
`,
		SelectUnprocessedEvents: `
SELECT id, created, type, blob, status, status_desc, sha, repository, branch, event, source_branch, target_branch, tag, artifact_id
FROM events
WHERE status='new' order by created ASC limit 10;
`,
		UpdateEventStatus: `
UPDATE events SET status = $1, status_desc = $2, results = $3 WHERE id = $4;
`,
		SelectGitopsCommitBySha: `
SELECT id, sha, status, status_desc, created
FROM gitops_commits
WHERE sha = $1;
`,
		SelectGitopsCommits: `
SELECT id, sha, status, status_desc, created, env
FROM gitops_commits
ORDER BY created DESC
LIMIT 20;
`,
		SelectKubeEventByName: `
SELECT id, name, status, status_desc
FROM kube_events
WHERE name = $1;
`,
		DeleteKubeEventByName: `
DELETE FROM kube_events where name = $1;
`,
		SelectAlerts: `
SELECT id, type, name, deployment_name, status, pending_at, fired_at, resolved_at
FROM alerts
WHERE fired_at > $1 OR pending_at > $1;
`,
		SelectAlertsByState: `
SELECT id, type, name, deployment_name, status, pending_at, fired_at, resolved_at
FROM alerts
WHERE status = $1;
`,
		SelectAlertsByName: `
SELECT id, type, name, deployment_name, status
FROM alerts
WHERE name = $1;
`,
		SelectAlertsByDeploymentName: `
SELECT id, type, name, deployment_name, status
FROM alerts
WHERE deployment_name = $1;
`,
		UpdateAlertStatusFired: `
UPDATE alerts SET status = $1, fired_at = $2 WHERE id = $3;
`,
		UpdateAlertStatusResolved: `
UPDATE alerts SET status = $1, resolved_at = $2 WHERE id = $3;
`,
	},
	"postgres": {
		Dummy: `
SELECT 1;
`,
		SelectUserByLogin: `
SELECT id, login, secret, admin, name, email, access_token, refresh_token, expires, secret, repos, favorite_repos, favorite_services
FROM users
WHERE login = $1;
`,
		SelectAllUser: `
SELECT id, login, secret, admin
FROM users;
`,
		SelectEverytingFromUsers: `
SELECT id, login, admin, name, email, access_token, refresh_token, expires, secret, repos, favorite_repos, favorite_services
FROM users;
`,
		DeleteUser: `
DELETE FROM users where login = $1;
`,
		SelectCommitsByRepo: `
SELECT id, repo, sha, url, author, author_pic, message, created, tags, status
FROM commits
WHERE repo = $1
LIMIT 20;
`,
		SelectKeyValue: `
SELECT id, key, value
FROM key_values
WHERE key = $1;
`,
		SelectEnvironments: `
SELECT id, name, infra_repo, apps_repo, repo_per_env, kustomization_per_app, built_in
FROM environments
ORDER BY name asc;
`,
		SelectEnvironment: `
SELECT id, name, infra_repo, apps_repo, repo_per_env, kustomization_per_app, built_in
FROM environments
WHERE name = $1;
`,
		DeleteEnvironment: `
DELETE FROM environments
WHERE name = $1;
`,
		SelectPodByName: `
SELECT id, name, status, status_desc
FROM pods
WHERE name = $1;
`,
		DeletePodByName: `
DELETE FROM pods where name = $1;
`,
		SelectUnprocessedEvents: `
SELECT id, created, type, blob, status, status_desc, sha, repository, branch, event, source_branch, target_branch, tag, artifact_id
FROM events
WHERE status='new' order by created ASC limit 10;
`,
		UpdateEventStatus: `
UPDATE events SET status = $1, status_desc = $2, results = $3 WHERE id = $4;
`,
		SelectGitopsCommitBySha: `
SELECT id, sha, status, status_desc, created
FROM gitops_commits
WHERE sha = $1;
`,
		SelectGitopsCommits: `
SELECT id, sha, status, status_desc, created, env
FROM gitops_commits
ORDER BY created DESC
LIMIT 20;
`,
		SelectKubeEventByName: `
SELECT id, name, status, status_desc
FROM kube_events
WHERE name = $1;
`,
		DeleteKubeEventByName: `
DELETE FROM kube_events where name = $1;
`,
		SelectAlerts: `
SELECT id, type, name, deployment_name, status, pending_at, fired_at, resolved_at
FROM alerts
WHERE fired_at > $1 OR pending_at > $1;
`,
		SelectAlertsByState: `
SELECT id, type, name, deployment_name, status, pending_at, fired_at, resolved_at
FROM alerts
WHERE status = $1;
`,
		SelectAlertsByName: `
SELECT id, type, name, deployment_name, status
FROM alerts
WHERE name = $1;
`,
		SelectAlertsByDeploymentName: `
SELECT id, type, name, deployment_name, status
FROM alerts
WHERE deployment_name = $1;
`,
		UpdateAlertStatusFired: `
UPDATE alerts SET status = $1, fired_at = $2 WHERE id = $3;
`,
		UpdateAlertStatusResolved: `
UPDATE alerts SET status = $1, resolved_at = $2 WHERE id = $3;
`,
	},
}
