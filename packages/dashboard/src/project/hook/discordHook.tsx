import {   
  Button,
  Grid,
  ListItemText,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { DiscordHook as DiscordHookType, ResultTypes } from '@sorry-cypress/common';
import { InputFieldLabel } from '@sorry-cypress/dashboard/components';
import {
  UpdateDiscordHookInput,
  useUpdateDiscordHookMutation,
} from '@sorry-cypress/dashboard/generated/graphql';
import React from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { EditHookEvents } from './editHookEvents';
import { enumToString } from './hook.utils';
import { useCurrentProjectId } from './useCurrentProjectId';
import { httpUrlValidation, jsonValidation, discordResultValidation } from './validation';

interface DiscordHookProps {
  hook: DiscordHookType;
}
export const DiscordHook = ({ hook }: DiscordHookProps) => {
  const projectId = useCurrentProjectId();
  const formMethods = useForm({
    mode: 'onChange',
  });

  const { register, handleSubmit, errors } = formMethods;

  const [updateGenericHook, { loading }] = useUpdateDiscordHookMutation();

  async function onSubmit(input: UpdateDiscordHookInput) {
    try {
      await updateGenericHook({
        variables: {
          input: { ...input, hookId: hook.hookId, projectId },
        },
      });
    } catch (error) {
      console.error(error);
    }
  }
  const hasErrors = Object.keys(errors).length > 0;
  return (
    <FormProvider {...formMethods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid>
          <Grid item xs={12}>
            <InputFieldLabel
              label="URL"
              htmlFor="url"
              required
              helpText="Incoming Webhook URL, e.g. https://discord.com/api/webhooks/XXX/YYYY"
              errorMessage={errors['url']?.message}
            >
              <TextField
                name="url"
                placeholder="Enter your Incoming Webhook URL"
                defaultValue={hook.url}
                inputRef={register({
                  required: {
                    value: true,
                    message: 'Webhook URL is required',
                  },
                  validate: {
                    httpUrlValidation,
                  },
                })}
                disabled={loading}
                size="small"
              />
            </InputFieldLabel>
          </Grid>
          
          <EditHookEvents hook={hook} disabled={loading} />
          <Grid item xs={12}>
            <InputFieldLabel
              helpText="You can specify when a webhook should be triggered: on failed runs, successful runs or flakey runs."
              label="Result Type"
              error={errors['discordResultFilter']?.message}
              htmlFor="discordResultFilter"
              required
            >
              <Controller
                name="discordResultFilter"
                defaultValue={hook.discordResultFilter}
                rules={{
                  required: {
                    value: true,
                    message: 'Event Filter is required',
                  },
                  validate: {
                    discordResultValidation,
                  },
                }}
                render={({ name, value, onChange, ref }) => (
                  <Select
                    name={name}
                    inputRef={ref}
                    onChange={(e) => onChange(e.target.value)}
                    value={value}
                    disabled={loading}
                    size="small"
                  >
                    {Object.keys(ResultTypes)
                      .sort()
                      .map((type) => (
                        <MenuItem key={type} value={type}>
                          <ListItemText primary={enumToString(type)} />
                        </MenuItem>
                      ))}
                  </Select>
                )}
              />
            </InputFieldLabel>
          </Grid>

          <Grid item>
            <Button
              variant="contained"
              color="primary"
              size="small"
              disabled={hasErrors || loading}
              type="submit"
            >
              Save
            </Button>
          </Grid>
        </Grid>
      </form>
    </FormProvider>
  );
};
