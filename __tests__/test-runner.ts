#!/usr/bin/env ts-node

/**
 * Comprehensive Test Runner for Frontend
 * 
 * This script runs all React Native test suites:
 * 1. Unit tests (services, hooks, utilities)
 * 2. Component tests (UI components)
 * 3. Integration tests (service integration)
 * 4. End-to-end tests (complete flows)
 * 5. Performance tests (large datasets, memory usage)
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

interface TestSuite {
    name: string;
    pattern: string;
    timeout: number;
    description: string;
    setupFiles?: string[];
}

const testSuites: TestSuite[] = [
    {
        name: 'Unit Tests',
        pattern: '**/*.unit.test.{ts,tsx}',
        timeout: 30000,
        description: 'Fast isolated unit tests for services and utilities',
        setupFiles: ['<rootDir>/jest.setup.js']
    },
    {
        name: 'Component Tests',
        pattern: 'components/**/*.test.{ts,tsx}',
        timeout: 30000,
        description: 'React Native component tests',
        setupFiles: ['<rootDir>/jest.setup.js', '@testing-library/react-native/extend-expect']
    },
    {
        name: 'Service Integration Tests',
        pattern: 'services/**/*.integration.test.{ts,tsx}',
        timeout: 60000,
        description: 'Service integration tests with mocked dependencies'
    },
    {
        name: 'End-to-End Tests',
        pattern: '**/*.e2e.test.{ts,tsx}',
        timeout: 120000,
        description: 'Complete user flow tests'
    },
    {
        name: 'Performance Tests',
        pattern: '**/*.performance.test.{ts,tsx}',
        timeout: 180000,
        description: 'Performance and memory usage tests'
    },
    {
        name: 'Hook Tests',
        pattern: 'hooks/**/*.test.{ts,tsx}',
        timeout: 30000,
        description: 'React hooks tests'
    },
    {
        name: 'Context Tests',
        pattern: 'contexts/**/*.test.{ts,tsx}',
        timeout: 30000,
        description: 'React context provider tests'
    }
];

class FrontendTestRunner {
    private verbose: boolean;
    private failFast: boolean;
    private coverage: boolean;
    private watchMode: boolean;

    constructor(options: {
        verbose?: boolean;
        failFast?: boolean;
        coverage?: boolean;
        watchMode?: boolean;
    } = {}) {
        this.verbose = options.verbose || false;
        this.failFast = options.failFast || false;
        this.coverage = options.coverage || false;
        this.watchMode = options.watchMode || false;
    }

    async runAllTests(): Promise<void> {
        console.log('🚀 Starting Frontend Test Suite\n');

        if (this.watchMode) {
            console.log('👀 Running in watch mode...');
            await this.runInWatchMode();
            return;
        }

        const results: { suite: string; passed: boolean; duration: number }[] = [];
        let totalDuration = 0;

        for (const suite of testSuites) {
            const startTime = Date.now();

            try {
                console.log(`📋 Running ${suite.name}...`);
                console.log(`   ${suite.description}`);

                await this.runTestSuite(suite);

                const duration = Date.now() - startTime;
                totalDuration += duration;

                results.push({ suite: suite.name, passed: true, duration });
                console.log(`✅ ${suite.name} passed (${duration}ms)\n`);

            } catch (error) {
                const duration = Date.now() - startTime;
                totalDuration += duration;

                results.push({ suite: suite.name, passed: false, duration });
                console.error(`❌ ${suite.name} failed (${duration}ms)`);

                if (this.verbose) {
                    console.error(error);
                }

                if (this.failFast) {
                    console.error('\n💥 Stopping due to test failure (fail-fast mode)');
                    process.exit(1);
                }
                console.log('');
            }
        }

        this.printSummary(results, totalDuration);
    }

    private async runTestSuite(suite: TestSuite): Promise<void> {
        const jestCommand = this.buildJestCommand(suite);

        if (this.verbose) {
            console.log(`   Command: ${jestCommand}`);
        }

        try {
            execSync(jestCommand, {
                stdio: this.verbose ? 'inherit' : 'pipe',
                timeout: suite.timeout,
                cwd: process.cwd(),
                env: {
                    ...process.env,
                    NODE_ENV: 'test'
                }
            });
        } catch (error: any) {
            if (error.status !== 0) {
                throw new Error(`Test suite failed with exit code ${error.status}`);
            }
            throw error;
        }
    }

    private buildJestCommand(suite: TestSuite): string {
        const baseCommand = 'npx jest';
        const options = [
            `--testPathPattern="${suite.pattern}"`,
            `--testTimeout=${suite.timeout}`,
            '--verbose',
            '--detectOpenHandles',
            '--forceExit'
        ];

        if (this.coverage) {
            options.push('--coverage');
            options.push('--coverageDirectory=coverage');
        }

        if (!this.verbose) {
            options.push('--silent');
        }

        if (suite.setupFiles) {
            suite.setupFiles.forEach(setupFile => {
                options.push(`--setupFilesAfterEnv=${setupFile}`);
            });
        }

        return `${baseCommand} ${options.join(' ')}`;
    }

    private async runInWatchMode(): Promise<void> {
        const jestCommand = 'npx jest --watch --verbose';

        try {
            execSync(jestCommand, {
                stdio: 'inherit',
                cwd: process.cwd(),
                env: {
                    ...process.env,
                    NODE_ENV: 'test'
                }
            });
        } catch (error) {
            console.error('Watch mode interrupted');
        }
    }

    private printSummary(results: { suite: string; passed: boolean; duration: number }[], totalDuration: number): void {
        console.log('📊 Frontend Test Summary');
        console.log('========================');

        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;

        results.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            const duration = `${result.duration}ms`;
            console.log(`${status} ${result.suite.padEnd(25)} ${duration.padStart(8)}`);
        });

        console.log('========================');
        console.log(`Total: ${results.length} suites`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Duration: ${totalDuration}ms`);

        if (this.coverage) {
            console.log('\n📈 Coverage report generated in ./coverage/');
        }

        if (failed > 0) {
            console.log('\n❌ Some tests failed!');
            process.exit(1);
        } else {
            console.log('\n🎉 All frontend tests passed!');
        }
    }

    async runSpecificSuite(suiteName: string): Promise<void> {
        const suite = testSuites.find(s => s.name.toLowerCase().includes(suiteName.toLowerCase()));

        if (!suite) {
            console.error(`❌ Test suite "${suiteName}" not found`);
            console.log('Available suites:');
            testSuites.forEach(s => console.log(`  - ${s.name}`));
            process.exit(1);
        }

        console.log(`🚀 Running ${suite.name}...`);

        try {
            await this.runTestSuite(suite);
            console.log(`✅ ${suite.name} completed successfully`);
        } catch (error) {
            console.error(`❌ ${suite.name} failed`);
            if (this.verbose) {
                console.error(error);
            }
            process.exit(1);
        }
    }

    async checkTestEnvironment(): Promise<void> {
        console.log('🔍 Checking frontend test environment...');

        // Check if required mock files exist
        const mockFiles = [
            path.join(process.cwd(), '__mocks__', 'expo-sqlite.ts'),
            path.join(process.cwd(), 'jest.setup.js'),
            path.join(process.cwd(), 'jest.config.js')
        ];

        for (const mockFile of mockFiles) {
            if (!existsSync(mockFile)) {
                console.warn(`⚠️  Mock file not found: ${path.basename(mockFile)}`);
            }
        }

        // Set test environment
        if (!process.env.NODE_ENV) {
            process.env.NODE_ENV = 'test';
        }

        console.log(`   Environment: ${process.env.NODE_ENV}`);
        console.log(`   Platform: React Native`);
        console.log('✅ Frontend environment check complete\n');
    }

    async generateCoverageReport(): Promise<void> {
        console.log('📈 Generating comprehensive coverage report...');

        const coverageCommand = [
            'npx jest',
            '--coverage',
            '--coverageDirectory=coverage',
            '--coverageReporters=text',
            '--coverageReporters=lcov',
            '--coverageReporters=html',
            '--collectCoverageFrom="services/**/*.{ts,tsx}"',
            '--collectCoverageFrom="hooks/**/*.{ts,tsx}"',
            '--collectCoverageFrom="contexts/**/*.{ts,tsx}"',
            '--collectCoverageFrom="components/**/*.{ts,tsx}"',
            '--collectCoverageFrom="!**/*.d.ts"',
            '--collectCoverageFrom="!**/node_modules/**"',
            '--collectCoverageFrom="!**/__tests__/**"'
        ].join(' ');

        try {
            execSync(coverageCommand, {
                stdio: 'inherit',
                cwd: process.cwd(),
                env: {
                    ...process.env,
                    NODE_ENV: 'test'
                }
            });

            console.log('✅ Coverage report generated successfully');
            console.log('   HTML report: ./coverage/lcov-report/index.html');

        } catch (error) {
            console.error('❌ Failed to generate coverage report');
            throw error;
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const options = {
        verbose: args.includes('--verbose') || args.includes('-v'),
        failFast: args.includes('--fail-fast') || args.includes('-f'),
        coverage: args.includes('--coverage') || args.includes('-c'),
        watchMode: args.includes('--watch') || args.includes('-w')
    };

    const runner = new FrontendTestRunner(options);

    // Check for specific commands
    const suiteArg = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));
    const coverageOnly = args.includes('--coverage-only');

    try {
        await runner.checkTestEnvironment();

        if (coverageOnly) {
            await runner.generateCoverageReport();
        } else if (suiteArg) {
            await runner.runSpecificSuite(suiteArg);
        } else {
            await runner.runAllTests();
        }
    } catch (error) {
        console.error('💥 Frontend test runner failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

export { FrontendTestRunner };