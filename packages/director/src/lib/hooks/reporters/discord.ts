import {
  HookEvent,
  isRunGroupSuccessful,
  Run,
  RunGroupProgress,
  DiscordHook,
  ResultTypes
} from '@sorry-cypress/common';
import { getDashboardRunURL } from '@sorry-cypress/director/lib/urls';
import { getLogger } from '@sorry-cypress/logger';
import axios from 'axios';
import { truncate } from 'lodash';

interface DiscordReporterEventPayload {
  eventType: HookEvent;
  run: Run;
  groupId: string;
  groupProgress: RunGroupProgress;
  spec: string;
}

export async function reportToDiscord(
  hook: DiscordHook,
  event: DiscordReporterEventPayload
) {
  if (!shouldReportDiscordHook(event.eventType, hook, event.groupProgress)) {
    return;
  }
  const ciBuildId = event.run.meta.ciBuildId;
  let groupLabel = '';

  if (event.groupId !== event.run.meta.ciBuildId) {
    groupLabel = `, group ${event.groupId}`;
  }

  let title = '';
  const isSuccessful = isRunGroupSuccessful(event.groupProgress);
  let color = isSuccessful ? successColor : failureColor;

  const branch = event.run.meta.commit?.branch;
  const commitDescription = event.run.meta.commit?.message;

  const fields = [
    { name: 'Branch', value: branch || 'No branch' },
    { name: 'Build Id', value: ciBuildId },
  ];

  if (groupLabel)
    fields.push({ name: 'Group', value: groupLabel });

  switch (event.eventType) {
    case HookEvent.RUN_START:
      title = 'Run Started';
      color = infoColor;
      break;
    case HookEvent.INSTANCE_START:
      title = 'Instance Started';
      color = infoColor;
      break;
    case HookEvent.INSTANCE_FINISH:
      title = 'Instance Finished';
      color = infoColor;
      break;
    case HookEvent.RUN_FINISH:
      title = 'Run Finished';
      break;
    case HookEvent.RUN_TIMEOUT:
      title = '⏳ Run Timed Out';
      color = failureColor;
      break;
  }

  const {
    passes,
    pending,
    skipped,
    failures,
    flaky,
  } = event.groupProgress.tests;

  if (event.eventType === HookEvent.RUN_FINISH) {
    fields.push(... [
      { name: 'Passes', value: `${passes}`, inline: true },
      { name: 'Failures', value: `${failures}`, inline: true },
      { name: 'Skipped', value: `${skipped}`, inline: true },
      { name: 'Ignored', value: `${pending}`, inline: true },
      { name: 'Flaky', value: `${flaky}`, inline: true }
    ]);
  }

  axios({
    method: 'post',
    url: hook.url,
    data: {
      embeds: [
          {
              title: title,
              description: commitDescription,
              url: getDashboardRunURL(event.run.runId),
              color: color,
              fields: fields
          }
      ]
    },
  }).catch((error) => {
    getLogger().error(
      { error, ...hook },
      `Error while posting Discord message to ${hook.url}`
    );
  });
}



export function shouldReportDiscordHook(
  event: HookEvent,
  hook: DiscordHook,
  groupProgress: RunGroupProgres
) {
  return isDiscordEventFilterPassed(event, hook) && isDiscordResultFilterPassed(hook, groupProgress);
}

export function isDiscordEventFilterPassed(event: HookEvent, hook: DiscordHook) {
  if (!hook.hookEvents || !hook.hookEvents.length) {
    return true;
  }

  return hook.hookEvents.includes(event);
}

export function isDiscordResultFilterPassed(
  hook: DiscordHook,
  groupProgress: RunGroupProgress
) {
  switch (hook.discordResultFilter) {
    case ResultTypes.FAILED:
      if (groupProgress.tests.failures > 0) return true;
      break;
    case ResultTypes.FLAKES:
      if (groupProgress.tests.flaky > 0) return true;
      break;
    case ResultTypes.SUCCESSFUL:
      if (groupProgress.tests.failures === 0) return true;
      break;
    case ResultTypes.ALL:
      return true;
    default:
      getLogger().error({ ... hook }, 'Unexpected Discord filter type');
      return false;
  }
  return false;
}

const successColor = 0x0E8A16;
const failureColor = 0xAB1616;
const infoColor = 0xEAC358;
