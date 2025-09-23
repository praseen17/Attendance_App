import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SuccessConfirmation, useSuccessConfirmation } from '../SuccessConfirmation';

// Mock Animated
jest.mock('react-native', () => {
    const RN = jest.requireActual('react-native');
    return {
        ...RN,
        Animated: {
            ...RN.Animated,
            timing: jest.fn(() => ({
                start: jest.fn((callback) => callback && callback()),
            })),
            parallel: jest.fn(() => ({
                start: jest.fn((callback) => callback && callback()),
            })),
            spring: jest.fn(() => ({
                start: jest.fn((callback) => callback && callback()),
            })),
            Value: jest.fn(() => ({
                setValue: jest.fn(),
                interpolate: jest.fn(() => '50%'),
            })),
        },
    };
});

describe('SuccessConfirmation', () => {
    const defaultProps = {
        visible: true,
        message: 'Success!',
        onDismiss: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders toast variant correctly', () => {
        render(<SuccessConfirmation {...defaultProps} variant="toast" />);

        expect(screen.getByText('Success!')).toBeTruthy();
    });

    it('renders modal variant correctly', () => {
        render(<SuccessConfirmation {...defaultProps} variant="modal" />);

        expect(screen.getByText('Success!')).toBeTruthy();
        expect(screen.getByText('OK')).toBeTruthy();
    });

    it('renders inline variant correctly', () => {
        render(<SuccessConfirmation {...defaultProps} variant="inline" />);

        expect(screen.getByText('Success!')).toBeTruthy();
    });

    it('displays details when provided', () => {
        render(
            <SuccessConfirmation
                {...defaultProps}
                details="Operation completed successfully"
            />
        );

        expect(screen.getByText('Success!')).toBeTruthy();
        expect(screen.getByText('Operation completed successfully')).toBeTruthy();
    });

    it('calls onDismiss when dismiss button is pressed', () => {
        const onDismiss = jest.fn();
        render(
            <SuccessConfirmation
                {...defaultProps}
                variant="toast"
                onDismiss={onDismiss}
            />
        );

        const dismissButton = screen.getByRole('button');
        fireEvent.press(dismissButton);

        expect(onDismiss).toHaveBeenCalled();
    });

    it('does not render when visible is false', () => {
        render(<SuccessConfirmation {...defaultProps} visible={false} />);

        expect(screen.queryByText('Success!')).toBeNull();
    });

    it('shows icon when showIcon is true', () => {
        render(<SuccessConfirmation {...defaultProps} showIcon={true} />);

        // Icon should be rendered (checkmark-circle)
        expect(screen.getByText('Success!')).toBeTruthy();
    });
});

describe('useSuccessConfirmation', () => {
    const TestComponent = () => {
        const { confirmation, showSuccess, hideSuccess } = useSuccessConfirmation();

        return (
            <>
                <SuccessConfirmation
                    visible={confirmation.visible}
                    message={confirmation.message}
                    details={confirmation.details}
                    variant={confirmation.variant}
                    onDismiss={hideSuccess}
                />
                <button
                    testID="show-success"
                    onPress={() => showSuccess('Test Success', 'Test Details', 'toast')}
                />
                <button
                    testID="hide-success"
                    onPress={hideSuccess}
                />
            </>
        );
    };

    it('manages success confirmation state correctly', async () => {
        render(<TestComponent />);

        // Initially not visible
        expect(screen.queryByText('Test Success')).toBeNull();

        // Show success
        fireEvent.press(screen.getByTestId('show-success'));

        await waitFor(() => {
            expect(screen.getByText('Test Success')).toBeTruthy();
            expect(screen.getByText('Test Details')).toBeTruthy();
        });

        // Hide success
        fireEvent.press(screen.getByTestId('hide-success'));

        await waitFor(() => {
            expect(screen.queryByText('Test Success')).toBeNull();
        });
    });
});