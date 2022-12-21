import {
  endGroup,
  error as coreError,
  getInput,
  info,
  setFailed,
  startGroup,
} from "@actions/core";
import { context } from "@actions/github";
import axios from "axios";

startGroup("Preparing CircleCI Pipeline Trigger");
const repoOrg = context.repo.owner;
const repoName = context.repo.repo;
info(`Org: ${repoOrg}`);
info(`Repo: ${repoName}`);
info(`Context:\n${JSON.stringify(context)}`);
const ref = context.ref;

const getBranch = () => {
  if (ref.startsWith("refs/heads/")) {
    return ref.substring(11);
  } else if (ref.startsWith("refs/pull/")) {
    info(`This is a PR. Using head PR branch`);
    const pullRequestNumber = ref.match(/refs\/pull\/([0-9]*)\//)[1];
    const newref = `pull/${pullRequestNumber}/head`;
    return newref;
  }
  return ref;
};

const getSha = () => {
  const payload = context.payload;
  if (payload !== null && payload !== undefined) {
    const pr = context.payload.pull_request;
    if (pr !== null && pr !== undefined) {
      const head = pr.head;
      if (head !== null && head !== undefined) {
        return head.sha;
      }
    }
  }
  return context.sha;
};

const headers = {
  "content-type": "application/json",
  "x-attribution-login": context.actor,
  "x-attribution-actor-id": context.actor,
  "Circle-Token": `${process.env.CCI_TOKEN}`,
};

const commit = getSha();
const branch = getBranch();

const parameters = {
  GHA_Actor: context.actor,
  GHA_Action: context.action,
  GHA_Event: context.eventName,
  GHA_Branch: branch,
  GHA_Commit: commit,
};

const metaData = getInput("GHA_Meta");
if (metaData.length > 0) {
  Object.assign(parameters, { GHA_Meta: metaData });
}

const body = {
  parameters: parameters,
};

const tag = commit;

Object.assign(body, { tag: tag });

const url = `https://circleci.com/api/v2/project/gh/${repoOrg}/${repoName}/pipeline`;

info(`Triggering CircleCI Pipeline for ${repoOrg}/${repoName}`);
info(`Triggering URL: ${url}`);
info(`Triggering commit: ${commit}`);
info(`Triggering tag: ${tag}`);
info(`Parameters:\n${JSON.stringify(parameters)}`);
endGroup();

axios
  .post(url, body, { headers: headers })
  .then((response) => {
    startGroup("Successfully triggered CircleCI Pipeline");
    info(`CircleCI API Response: ${JSON.stringify(response.data)}`);
    endGroup();
  })
  .catch((error) => {
    startGroup("Failed to trigger CircleCI Pipeline");
    coreError(error);
    setFailed(error.message);
    endGroup();
  });
