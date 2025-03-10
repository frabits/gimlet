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

package api

import (
	"fmt"

	"github.com/gimlet-io/gimlet-cli/pkg/dx"
)

type Service struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

type Pod struct {
	Name              string `json:"name"`
	DeploymentName    string `json:"deploymentName"`
	Namespace         string `json:"namespace"`
	Status            string `json:"status"`
	StatusDescription string `json:"statusDescription"`
	Logs              string `json:"logs"`
}

func (p *Pod) FQN() string {
	return p.Namespace + "/" + p.Name
}

type Deployment struct {
	Name          string `json:"name"`
	Namespace     string `json:"namespace"`
	Pods          []*Pod `json:"pods,omitempty"`
	SHA           string `json:"sha"`
	CommitMessage string `json:"commitMessage"`
	Details       string `json:"details,omitempty"`
}

func (d *Deployment) FQN() string {
	return d.Namespace + "/" + d.Name
}

type Ingress struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	URL       string `json:"url"`
}

type ConnectedAgent struct {
	Name      string     `json:"name"`
	Stacks    []*Stack   `json:"stacks"`
	FluxState *FluxState `json:"fluxState"`
}

type GitRepository struct {
	Name               string `json:"name"`
	Namespace          string `json:"namespace"`
	Revision           string `json:"revision"`
	LastTransitionTime int64  `json:"lastTransitionTime"`
	Status             string `json:"status"`
	StatusDesc         string `json:"statusDesc"`
}

func (g GitRepository) String() string {
	return fmt.Sprintf("GitRepository (@%s) %s/%s - %d - %s: %s", g.Revision, g.Namespace, g.Name, g.LastTransitionTime, g.Status, g.StatusDesc)
}

type Kustomization struct {
	Name               string `json:"name"`
	Namespace          string `json:"namespace"`
	GitRepository      string `json:"gitRepostory"`
	Path               string `json:"revision"`
	Prune              bool   `json:"prune"`
	LastTransitionTime int64  `json:"lastTransitionTime"`
	Status             string `json:"status"`
	StatusDesc         string `json:"statusDesc"`
}

func (k Kustomization) String() string {
	return fmt.Sprintf("Kustomization %s/%s - %d - %s: %s", k.Namespace, k.Name, k.LastTransitionTime, k.Status, k.StatusDesc)
}

type HelmRelease struct {
	Name               string `json:"name"`
	Namespace          string `json:"namespace"`
	LastTransitionTime int64  `json:"lastTransitionTime"`
	Status             string `json:"status"`
	StatusDesc         string `json:"statusDesc"`
}

func (h HelmRelease) String() string {
	return fmt.Sprintf("HelmRelease %s/%s - %d - %s: %s", h.Namespace, h.Name, h.LastTransitionTime, h.Status, h.StatusDesc)
}

type Event struct {
	FirstTimestamp int64  `json:"firstTimestamp"`
	Count          int32  `json:"count"`
	Name           string `json:"name"`
	DeploymentName string `json:"deploymentName"`
	Namespace      string `json:"namespace"`
	Status         string `json:"status"`
	StatusDesc     string `json:"statusDesc"`
}

type Alert struct {
	ObjectName     string `json:"objectName"`
	DeploymentName string `json:"deploymentName"`
	Status         string `json:"status"`
	Type           string `json:"type"`
	Name           string `json:"name"`
	Text           string `json:"text"`
	PendingAt      int64  `json:"pendingAt"`
	FiredAt        int64  `json:"firedAt"`
	ResolvedAt     int64  `json:"resolvedAt"`
}

type GitopsEnv struct {
	Name                        string                 `json:"name"`
	InfraRepo                   string                 `json:"infraRepo"`
	AppsRepo                    string                 `json:"appsRepo"`
	RepoPerEnv                  bool                   `json:"repoPerEnv"`
	KustomizationPerApp         bool                   `json:"kustomizationPerApp"`
	BuiltIn                     bool                   `json:"builtIn"`
	StackConfig                 *dx.StackConfig        `json:"stackConfig"`
	StackDefinition             map[string]interface{} `json:"stackDefinition"`
	DeploymentAutomationEnabled bool                   `json:"deploymentAutomationEnabled"`
}

type GitopsBootstrapConfig struct {
	EnvName            string `json:"envName"`
	RepoPerEnv         bool   `json:"repoPerEnv"`
	KusomizationPerApp bool   `json:"kustomizationPerApp"`
	InfraRepo          string `json:"infraRepo"`
	AppsRepo           string `json:"appsRepo"`
}

type FluxState struct {
	GitReppsitories []*GitRepository `json:"gitRepositories"`
	Kustomizations  []*Kustomization `json:"kustomizations"`
	HelmReleases    []*HelmRelease   `json:"helmReleases"`
}

type FluxStateUpdate struct {
	Event     string    `json:"event"`
	FluxState FluxState `json:"fluxState"`
}

type Stack struct {
	Repo       string      `json:"repo"`
	Env        string      `json:"env"`
	Osca       *Osca       `json:"osca"`
	Service    *Service    `json:"service"`
	Deployment *Deployment `json:"deployment,omitempty"`
	Ingresses  []*Ingress  `json:"ingresses,omitempty"`
}

type StackUpdate struct {
	Event   string `json:"event"`
	Repo    string `json:"repo"`
	Env     string `json:"env"`
	Subject string `json:"subject"`
	Svc     string `json:"svc"`

	// Pod
	Status     string `json:"status"`
	Deployment string `json:"deployment"`
	ErrorCause string `json:"errorCause"`
	Logs       string `json:"logs"`

	// Deployment
	SHA           string `json:"sha"`
	CommitMessage string `json:"commitMessage"` // only used in streamed update to frontend

	// Ingress
	URL string `json:"url"`

	// Service
	Stacks []*Stack `json:"stacks"`
}

// Open Service Catalog Annotations
type Osca struct {
	DocsLink    string `json:"docsLink"`
	LogsLink    string `json:"logsLink"`
	MetricsLink string `json:"metricsLink"`
	TracesLink  string `json:"tracesLink"`
	IssuesLink  string `json:"issuesLink"`
	Owner       string `json:"owner"`
}

type Tag struct {
	SHA  string `json:"sha"`
	Name string `json:"name"`
}

type PR struct {
	Sha     string `json:"sha"`
	Link    string `json:"link"`
	Title   string `json:"title"`
	Source  string `json:"source"`
	Number  int    `json:"number"`
	Author  string `json:"author"`
	Created int    `json:"created"`
	Updated int    `json:"updated"`
}

type DeployTarget struct {
	App        string `json:"app"`
	Env        string `json:"env"`
	Tenant     string `json:"tenant"`
	ArtifactId string `json:"artifactId"`
}
