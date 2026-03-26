import { expect } from 'chai';
import sinon from 'sinon';

import {
    ADMIN_LOCATION_VALIDATION_THROTTLE_MS,
    ADMIN_LOCATION_VALIDATION_TIMEOUT_MS,
    AdminLocationMessageHandler,
} from '../src/lib/admin-location-message-handler';

type SentMessage = {
    to: string;
    command: string;
    message: unknown;
    callback: unknown;
};

function createIoBrokerMessage(overrides: Partial<ioBroker.Message> = {}): ioBroker.Message {
    return {
        command: 'resolveLocationConfig',
        from: 'system.adapter.admin.0',
        callback: { message: 'callback', id: 1, ack: false, time: Date.now() },
        message: {
            city: 'Berlin',
            countryCode: 'DE',
            timezoneMode: 'auto',
            timezone: 'Europe/Berlin',
        },
        ...overrides,
    } as ioBroker.Message;
}

describe('AdminLocationMessageHandler', () => {
    let clock: sinon.SinonFakeTimers | undefined;

    afterEach(() => {
        clock?.restore();
        clock = undefined;
    });

    it('forwards valid admin requests to the location resolver', async () => {
        const sentMessages: SentMessage[] = [];
        const validateGeocodeLocation = sinon.stub().resolves({
            native: { city: 'Berlin', countryCode: 'DE' },
            text: 'Found: Berlin, Germany.',
            icon: 'connection',
            style: { color: '#2e7d32' },
        });
        const handler = new AdminLocationMessageHandler(
            {
                sendTo: (to, command, message, callback) => {
                    sentMessages.push({ to, command, message, callback });
                },
            },
            { locationResolver: { validateGeocodeLocation } },
        );

        const handled = await handler.handleMessage(createIoBrokerMessage());

        expect(handled).to.equal(true);
        expect(validateGeocodeLocation.calledOnce).to.equal(true);
        expect(validateGeocodeLocation.firstCall.args[0]).to.deep.equal({
            city: 'Berlin',
            countryCode: 'DE',
            timezoneMode: 'auto',
            timezone: 'Europe/Berlin',
        });
        expect(validateGeocodeLocation.firstCall.args[1]).to.be.instanceOf(AbortSignal);
        expect(sentMessages).to.have.lengthOf(1);
        expect(sentMessages[0].to).to.equal('system.adapter.admin.0');
    });

    it('ignores messages that do not come from the admin adapter', async () => {
        const validateGeocodeLocation = sinon.stub();
        const sendTo = sinon.spy();
        const handler = new AdminLocationMessageHandler({ sendTo }, { locationResolver: { validateGeocodeLocation } });

        const handled = await handler.handleMessage(
            createIoBrokerMessage({
                from: 'system.adapter.javascript.0',
            }),
        );

        expect(handled).to.equal(false);
        expect(validateGeocodeLocation.called).to.equal(false);
        expect(sendTo.called).to.equal(false);
    });

    it('ignores messages without a callback', async () => {
        const handler = new AdminLocationMessageHandler({ sendTo: sinon.spy() });

        const handled = await handler.handleMessage(
            createIoBrokerMessage({
                callback: undefined,
            }),
        );

        expect(handled).to.equal(false);
    });

    it('rejects invalid admin payloads before sending a geocoding request', async () => {
        const sendTo = sinon.spy();
        const validateGeocodeLocation = sinon.stub();
        const handler = new AdminLocationMessageHandler({ sendTo }, { locationResolver: { validateGeocodeLocation } });

        const handled = await handler.handleMessage(
            createIoBrokerMessage({
                message: {
                    city: '',
                    countryCode: 'DE',
                    timezoneMode: 'broken',
                    timezone: 'Europe/Berlin',
                },
            }),
        );

        expect(handled).to.equal(true);
        expect(validateGeocodeLocation.called).to.equal(false);
        expect(sendTo.calledOnce).to.equal(true);
        expect(sendTo.firstCall.args[2]).to.include({
            text: 'Please enter a city before checking the location.',
        });
    });

    it('returns a timeout error when city validation exceeds the server-side limit', async () => {
        clock = sinon.useFakeTimers();
        const sendTo = sinon.spy();
        const validateGeocodeLocation = sinon.stub().callsFake(
            async (_request, signal?: AbortSignal) =>
                new Promise((resolve, reject) => {
                    signal?.addEventListener(
                        'abort',
                        () => {
                            reject(
                                signal.reason instanceof Error
                                    ? signal.reason
                                    : new Error(String(signal.reason ?? 'aborted')),
                            );
                        },
                        { once: true },
                    );
                    void resolve;
                }),
        );
        const handler = new AdminLocationMessageHandler(
            { sendTo },
            {
                locationResolver: { validateGeocodeLocation },
                now: () => Date.now(),
            },
        );

        const pendingHandle = handler.handleMessage(createIoBrokerMessage());
        await clock.tickAsync(ADMIN_LOCATION_VALIDATION_TIMEOUT_MS);
        await pendingHandle;

        expect(sendTo.calledOnce).to.equal(true);
        expect(sendTo.firstCall.args[2]).to.include({
            text: `City validation timed out after ${ADMIN_LOCATION_VALIDATION_TIMEOUT_MS} ms.`,
        });
    });

    it('rejects overlapping city checks while one is already running', async () => {
        let resolveValidation: (() => void) | undefined;
        const sendTo = sinon.spy();
        const validateGeocodeLocation = sinon.stub().callsFake(
            async () =>
                new Promise(resolve => {
                    resolveValidation = () =>
                        resolve({
                            native: { city: 'Berlin', countryCode: 'DE' },
                            text: 'Found: Berlin, Germany.',
                        });
                }),
        );
        const handler = new AdminLocationMessageHandler({ sendTo }, { locationResolver: { validateGeocodeLocation } });

        const firstRequest = handler.handleMessage(createIoBrokerMessage());
        await Promise.resolve();
        const secondHandled = await handler.handleMessage(createIoBrokerMessage());
        resolveValidation?.();
        await firstRequest;

        expect(secondHandled).to.equal(true);
        expect(validateGeocodeLocation.calledOnce).to.equal(true);
        expect(sendTo.callCount).to.equal(2);
        expect(
            sendTo
                .getCalls()
                .map(call => (call.args[2] as { text?: string }).text)
                .includes('Another city check is already running. Please wait until it finishes.'),
        ).to.equal(true);
    });

    it('throttles repeated city checks for one second after an accepted request', async () => {
        clock = sinon.useFakeTimers();
        const sendTo = sinon.spy();
        const validateGeocodeLocation = sinon.stub().resolves({
            native: { city: 'Berlin', countryCode: 'DE' },
            text: 'Found: Berlin, Germany.',
        });
        const handler = new AdminLocationMessageHandler(
            { sendTo },
            {
                locationResolver: { validateGeocodeLocation },
                now: () => Date.now(),
            },
        );

        await handler.handleMessage(createIoBrokerMessage());
        const throttled = await handler.handleMessage(createIoBrokerMessage());
        await clock.tickAsync(ADMIN_LOCATION_VALIDATION_THROTTLE_MS);

        expect(throttled).to.equal(true);
        expect(validateGeocodeLocation.calledOnce).to.equal(true);
        expect(sendTo.secondCall.args[2]).to.include({
            text: `Please wait at least ${ADMIN_LOCATION_VALIDATION_THROTTLE_MS} ms between city checks.`,
        });
    });
});
