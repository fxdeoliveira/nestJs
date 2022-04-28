import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { AuthInfoService } from '@webex/atlas/auth/info';
import { WebexCallingE911NotificationService } from '@webex/atlas/call/data-access';
import { EmergencyCallSettingsSetupService } from '@webex/atlas/call/emergency/data-access';
import {
  EmergencyCallSettingsSetupModalComponent,
  EnhancedEmergencyCallingSetupModalComponent,
} from '@webex/atlas/call/emergency/feature';
import { FeatureTogglesFacade } from '@webex/atlas/feature-toggles/data-access';
import {
  AtlasOrgSettingsDataAccessModule,
  EnhancedEmergencyCallingSettingsFacade,
} from '@webex/atlas/org-settings/data-access';
import { ExperienceService } from '@webex/atlas/organization-health/data-access';
import { SMBViewModeState } from '@webex/atlas/smb/data-access';
import { SMBViewMode } from '@webex/atlas/smb/types';
import {
  MOCK_SITES_DATA,
  UpgradeMeetingsFacade,
  UpgradeMeetingsService,
} from '@webex/atlas/upgrade-and-migration/data-access';
import { NotificationsFacade } from '@webex/common/notifications/data-access';
import {
  CommonTestUtilsModule,
  createComponent,
  injectMocked,
  MockState,
  Page,
  provideMockObject,
} from '@webex/common/test-utils';
import { ModalService, PageLayoutModule } from '@webex/common/ui/momentum-ch';
import { EnvService } from '@webex/common/utils/env';
import { MockComponents, MockModule } from 'ng-mocks';
import { of } from 'rxjs';
import { OverviewFacade } from '../+state/overview.facade';
import { DevicesComponent } from '../devices';
import { NewFeaturesComponent } from '../new-features/new-features.component';
import { OnboardingStatusComponent } from '../onboarding-status/onboarding-status.component';
import { QuickLinksComponent } from '../quick-links/quick-links.component';
import { ServiceStatusComponent } from '../service-status/service-status.component';
import { RefreshOverviewComponent } from './refresh-overview.component';

class MockSetupWizardService {
  serviceDataHasBeenInitialized = true;
  provisionedState = {
    needsWebex: 'needs-webex',
  };
  showPendingConsent = jest.fn();
  hasPendingCCWSubscriptions = jest.fn();
  hasPendingMultiPartnerWebexTrial = jest.fn();
  getActingSubscriptionServiceOrderUUID = jest.fn(() => 'test-id');
  getPendingOrderStatusDetails = jest.fn(() => Promise.resolve(['test-id']));
  getModifyFeatureFlagValue = jest.fn();
  setProductProvStatus = jest.fn();
  getProvisioningState = jest.fn(() => 'needs-webex');
}

class MockUpgradeMeetingsService {
  isGetStartedState = () => {
    return true;
  };
  getSplashPageShownStatus = () => {
    return false;
  };
}

class MockLinkedSiteModalService {
  showNewLinkedSiteModal = jest.fn();
}

class RefreshOverviewPage extends Page<RefreshOverviewComponent> {
  setupWizardService: MockSetupWizardService;

  get isSMBViewModeUnRestrictedAlertBanner() {
    return this.elementQuery('[data-test-name=isSMBViewModeUnRestricted]');
  }

  get isSMBViewModeRestrictedAlertBanner() {
    return this.elementQuery('[data-test-name=isSMBViewModeRestricted]');
  }

  get isRayBaumBanner() {
    return this.elementQuery('[data-test-name=rayBaumBanner]');
  }

  get title() {
    return this.elementQuery('.overview-title');
  }

  get webexServiceStatus() {
    return this.elementQuery('webex-service-status');
  }

  get hybridServiceStatus() {
    return this.elementQuery('webex-hybrid-status');
  }

  get onboardingStatus() {
    return this.elementQuery('webex-onboarding-status');
  }

  get quickLinks() {
    return this.elementQuery('webex-quick-links');
  }

  get upgradeServices() {
    return this.elementQuery('webex-upgrade-services');
  }

  get devicesStatus() {
    return this.elementQuery('webex-devices');
  }

  get newFeatures() {
    return this.elementQuery('webex-new-features');
  }

  get setupReminder() {
    return this.elementQuery('webex-setup-reminder');
  }

  get webexTourLink() {
    return this.elementQuery('webex-walkme-link');
  }

  get newOffers() {
    return this.elementQuery('webex-new-offers');
  }

  get isEmergencyCallSettingsSetupBanner() {
    return this.elementQuery('[data-test-name=emergencyCallSettingsSetupBanner]');
  }

  constructor(f: ComponentFixture<RefreshOverviewComponent>) {
    super(f);
    this.setupWizardService = this.inject('SetupWizardService');
  }
}

describe('RefreshOverviewComponent', () => {
  const enabledFeatureToggles: string[] = [];

  let $state: MockState;
  let activatedRoute: Partial<ActivatedRoute>;
  let authInfoService: jest.Mocked<AuthInfoService>;
  let component: RefreshOverviewComponent;
  let experienceService: jest.Mocked<ExperienceService>;
  let featureTogglesFacade: jest.Mocked<FeatureTogglesFacade>;
  let envService: jest.Mocked<EnvService>;
  let fixture: ComponentFixture<RefreshOverviewComponent>;
  let page: RefreshOverviewPage;
  let smbViewModeState: jest.Mocked<SMBViewModeState>;
  let webexCallingE911NotificationService: jest.Mocked<WebexCallingE911NotificationService>;
  let modalService: jest.Mocked<ModalService>;
  let enhancedEmergencyFacade: jest.Mocked<EnhancedEmergencyCallingSettingsFacade>;

  const activatedRouteFactory = () => activatedRoute;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [
          MockComponents(
            DevicesComponent,
            NewFeaturesComponent,
            OnboardingStatusComponent,
            QuickLinksComponent,
            ServiceStatusComponent
          ),
          RefreshOverviewComponent,
        ],
        imports: [
          CommonTestUtilsModule,
          MockModule(AtlasOrgSettingsDataAccessModule),
          MockModule(PageLayoutModule),
        ],
        providers: [
          {
            provide: '$state',
            useClass: MockState,
          },
          {
            provide: 'LinkedSiteModalService',
            useClass: MockLinkedSiteModalService,
          },
          {
            provide: 'SetupWizardService',
            useClass: MockSetupWizardService,
          },
          {
            provide: ActivatedRoute,
            useFactory: activatedRouteFactory,
          },
          { provide: UpgradeMeetingsService, useClass: MockUpgradeMeetingsService },
          provideMockObject(AuthInfoService),
          provideMockObject(EnhancedEmergencyCallingSettingsFacade),
          provideMockObject(EnvService),
          provideMockObject(ExperienceService),
          provideMockObject(FeatureTogglesFacade),
          provideMockObject(ModalService),
          provideMockObject(NotificationsFacade),
          provideMockObject(OverviewFacade),
          provideMockObject(SMBViewModeState),
          provideMockObject(UpgradeMeetingsFacade),
          provideMockObject(WebexCallingE911NotificationService),
          provideMockObject(EmergencyCallSettingsSetupService),
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      });

      envService = injectMocked(EnvService);
      envService.isFedRamp.mockReturnValue(false);

      featureTogglesFacade = TestBed.inject(FeatureTogglesFacade) as jest.Mocked<
        FeatureTogglesFacade
      >;
      featureTogglesFacade.supports$.mockImplementation(toggleName =>
        of(enabledFeatureToggles.includes(toggleName))
      );

      authInfoService = injectMocked(AuthInfoService);
      authInfoService.getPendingSubscriptions.mockReturnValue({ subsId: 'pending-subs' });
      authInfoService.getUserName.mockReturnValue('fake-user-name');
      authInfoService.hasRole.mockReturnValue(true);
      authInfoService.isAdminSettingUpOrg = jest.fn();
      authInfoService.isPartner.mockReturnValue(false);
      authInfoService.isProvisionAdmin.mockReturnValue(false);

      experienceService = injectMocked(ExperienceService);
      experienceService.getExperienceLaunched$ = of(true);

      smbViewModeState = injectMocked(SMBViewModeState);
      smbViewModeState.getSMBViewMode.mockReturnValue(of(SMBViewMode.UNRESTRICTED));

      webexCallingE911NotificationService = injectMocked(WebexCallingE911NotificationService);
      webexCallingE911NotificationService.notification$ = of({
        enable: false,
      });

      modalService = injectMocked(ModalService);
      modalService.open = jest.fn();
      enhancedEmergencyFacade = injectMocked(EnhancedEmergencyCallingSettingsFacade);
      enhancedEmergencyFacade.enhancedEmergencyCallingSetupSettings$ = of(undefined);
      $state = injectMocked('$state' as any);
    })
  );

  describe('With state data', () => {
    beforeEach(() => {
      activatedRoute = {
        snapshot: {
          data: {
            state: {
              trial: {
                trialId: 'fake-trial-id',
                customerName: 'fake-customer-name',
                customerOrgId: 'fake-customer-org-id',
                partnerOrgId: 'fake-partner-org-id',
                partnerUuid: 'fake-partner-uuid',
              },
              showInvalidTrialModal: true,
            },
          },
        } as Partial<ActivatedRouteSnapshot>,
      } as Partial<ActivatedRoute>;

      ({ fixture, page, component } = createComponent(
        RefreshOverviewComponent,
        RefreshOverviewPage
      ));
      fixture.detectChanges();
    });

    test(`should navigate to 'invalid-trial-modal' state when component inits`, () => {
      expect($state.go).toHaveBeenCalledWith('invalid-trial-modal', {
        trial: 'fake-trial-id',
        customerName: 'fake-customer-name',
        customerOrgId: 'fake-customer-org-id',
        partnerOrgId: 'fake-partner-org-id',
        partnerUuid: 'fake-partner-uuid',
      });
    });
  });

  describe('Without state data', () => {
    beforeEach(() => {
      activatedRoute = {
        snapshot: {
          data: {},
        } as ActivatedRouteSnapshot,
      };

      ({ fixture, page, component } = createComponent(
        RefreshOverviewComponent,
        RefreshOverviewPage
      ));
      fixture.detectChanges();
    });

    test('should have title and cards', () => {
      expect(page.title.textContent).toContain('overview.pageTitle');
      expect(page.webexServiceStatus).not.toBeNull();
      expect(page.hybridServiceStatus).not.toBeNull();
      expect(page.onboardingStatus).not.toBeNull();
      expect(page.upgradeServices).toBeNull();
      expect(page.devicesStatus).not.toBeNull();
      expect(page.newFeatures).not.toBeNull();
      expect(page.quickLinks).not.toBeNull();
      expect(page.setupReminder).toBeNull();
      expect(page.webexTourLink).toBeNull();
      expect(page.newOffers).toBeNull();
    });

    describe('Setup reminder', () => {
      test('should have setup reminder for first setup', fakeAsync(() => {
        page.setupWizardService.showPendingConsent.mockReturnValue(false);
        authInfoService.isAdminSettingUpOrg.mockReturnValue(true);
        component.ngOnInit();
        tick();
        fixture.detectChanges();
        expect(page.setupReminder).not.toBeNull();
      }));

      test('should have setup reminder for meeting setup', fakeAsync(() => {
        page.setupWizardService.showPendingConsent.mockReturnValue(false);
        authInfoService.isAdminSettingUpOrg.mockReturnValue(false);
        page.setupWizardService.hasPendingCCWSubscriptions.mockReturnValue(true);
        page.setupWizardService.getModifyFeatureFlagValue.mockReturnValue(true);
        component.ngOnInit();
        tick();
        fixture.detectChanges();

        tick();
        fixture.detectChanges();
        expect(page.setupReminder).not.toBeNull();
      }));
    });

    test('should show walkme link if feature toggle enabled', () => {
      component.showTourLink$ = of(true);
      fixture.detectChanges();
      expect(page.webexTourLink).not.toBeNull();
    });

    test('should show upgrade and services if feature toggle enabled', () => {
      component.showUpgradeServicesCard$ = of(true);
      fixture.detectChanges();
      expect(page.upgradeServices).not.toBeNull();
    });

    test('should show new offer card if feature toggle enabled', () => {
      component.showNewOffersCard$ = of(true);
      fixture.detectChanges();
      expect(page.newOffers).not.toBeNull();
    });

    test('canShowUpgradeSplash', () => {
      component['upgradeMeetingsEnabled'] = true;
      fixture.detectChanges();
      expect(component.canShowUpgradeSplash(MOCK_SITES_DATA)).toBe(true);
      component['upgradeMeetingsEnabled'] = false;
      expect(component.canShowUpgradeSplash(MOCK_SITES_DATA)).toBe(false);
    });

    describe('SMB alert banner', () => {
      it('should have SMBViewModeUnRestricted alert banner and the banner should close on clicking on close button on banner', () => {
        fixture.detectChanges();
        component.showRestrictedViewBanner = true;
        expect(page.isSMBViewModeUnRestrictedAlertBanner).not.toBe(null);
        expect(page.isSMBViewModeRestrictedAlertBanner).toBe(null);
        component.closeRestrictedViewBanner();
        fixture.detectChanges();
        expect(page.isSMBViewModeUnRestrictedAlertBanner).toBe(null);
      });

      it('should have SMBViewModeRestricted alert banner and the banner should close on clicking on close button on banner', () => {
        smbViewModeState.getSMBViewMode.mockReturnValue(of(SMBViewMode.RESTRICTED));
        ({ fixture, page, component } = createComponent(
          RefreshOverviewComponent,
          RefreshOverviewPage
        ));
        component.showRestrictedViewBanner = true;
        fixture.detectChanges();
        expect(page.isSMBViewModeUnRestrictedAlertBanner).toBe(null);
        expect(page.isSMBViewModeRestrictedAlertBanner).not.toBe(null);
        component.closeRestrictedViewBanner();
        fixture.detectChanges();
        expect(page.isSMBViewModeRestrictedAlertBanner).toBe(null);
      });
    });

    describe('RayBaumBanner', () => {
      it('should not have RayBaumBanner alert banner', () => {
        fixture.detectChanges();
        expect(page.isRayBaumBanner).toBe(null);
      });

      it('should have RayBaumBanner alert banner and the banner should close on clicking on close button on banner', () => {
        webexCallingE911NotificationService.notification$ = of({
          enable: true,
        });
        ({ fixture, page, component } = createComponent(
          RefreshOverviewComponent,
          RefreshOverviewPage
        ));
        fixture.detectChanges();
        expect(page.isRayBaumBanner).not.toBe(null);
        component.closeRayBaumBanner();
        fixture.detectChanges();
        expect(page.isRayBaumBanner).toBe(null);
      });

      it('should open enhanced emergency calling setup modal on clicking link', () => {
        ({ fixture, page, component } = createComponent(
          RefreshOverviewComponent,
          RefreshOverviewPage
        ));
        const openEnhancedEmergencyCallingSetupModal = jest.spyOn(modalService, 'open');
        component.openEnhancedEmergencyCallingSetupModal();
        expect(openEnhancedEmergencyCallingSetupModal).toHaveBeenCalled();
      });

      it('should open enhanced emergency calling setup modal on clicking link with parameters', () => {
        ({ fixture, page, component } = createComponent(
          RefreshOverviewComponent,
          RefreshOverviewPage
        ));
        const openEnhancedEmergencyCallingSetupModal = jest.spyOn(modalService, 'open');
        component.openEnhancedEmergencyCallingSetupModal();
        expect(openEnhancedEmergencyCallingSetupModal).toHaveBeenCalledWith({
          content: EnhancedEmergencyCallingSetupModalComponent,
          data: {},
          backdrop: true,
          backdropClickExit: false,
          sizeType: 'full',
        });
      });

      it('should not have RayBaumBanner alert banner and the banner when locations are confirmed', () => {
        webexCallingE911NotificationService.notification$ = of({
          enable: false,
        });
        ({ fixture, page, component } = createComponent(
          RefreshOverviewComponent,
          RefreshOverviewPage
        ));
        fixture.detectChanges();
        expect(page.isRayBaumBanner).toBe(null);
      });
    });

    describe('showWebexExperienceCard', () => {
      it('should show webex experience card', done => {
        envService.isFedRamp.mockReturnValue(false);
        experienceService.getExperienceLaunched$ = of(true);
        component.showWebexExperienceCard$.subscribe(value => {
          expect(value).toBe(true);
          done();
        });
      });

      it('should not show webex experience card if is FedRamp environment', done => {
        envService.isFedRamp.mockReturnValue(true);
        experienceService.getExperienceLaunched$ = of(true);
        component.showWebexExperienceCard$.subscribe(value => {
          expect(value).toBe(false);
          done();
        });
      });
    });

    describe('showGettingStartedCard$', () => {
      it('should return false if Webex Experience card is displayed', done => {
        component.showGettingStartedCard$.subscribe(value => {
          expect(value).toBe(false);
          done();
        });
      });

      it('should return false if Getting Started FT is off', done => {
        featureTogglesFacade.supports$.mockReturnValue(of(false));

        component.showGettingStartedCard$.subscribe(value => {
          expect(value).toBe(false);
          done();
        });
      });

      it('should return false if Webex Experience is not displayed and if FT is on', done => {
        featureTogglesFacade.supports$.mockReturnValue(of(false));

        component.showGettingStartedCard$.subscribe(value => {
          expect(value).toBe(false);
          done();
        });
      });

      it('should not show getting started card when customer type is FedRamp', done => {
        envService.isFedRamp.mockReturnValue(true);

        component.showGettingStartedCard$.subscribe(value => {
          expect(value).toBe(false);
          done();
        });
      });
    });

    describe('EmergencyCallSettingsSetupBanner', () => {
      it('should not have EmergencyCallSettingsSetupBanner alert banner', () => {
        fixture.detectChanges();
        expect(page.isEmergencyCallSettingsSetupBanner).toBe(null);
      });

      it('should have EmergencyCallSettingsSetupBanner alert banner and the banner should close on clicking on close button on banner', () => {
        webexCallingE911NotificationService.notification$ = of({
          enable: false,
        });
        ({ fixture, page, component } = createComponent(
          RefreshOverviewComponent,
          RefreshOverviewPage
        ));
        fixture.detectChanges();
        expect(page.isEmergencyCallSettingsSetupBanner).not.toBe(false);
        component.closeEmergencyCallSettingsSetupBanner();
        fixture.detectChanges();
        expect(page.isEmergencyCallSettingsSetupBanner).toBe(null);
      });

      it('should open emergency calling settings setup modal on clicking link', () => {
        ({ fixture, page, component } = createComponent(
          RefreshOverviewComponent,
          RefreshOverviewPage
        ));
        const openEmergencyCallSettingsSetupModal = jest.spyOn(modalService, 'open');
        component.openEmergencyCallSettingsSetupModal(true);
        expect(openEmergencyCallSettingsSetupModal).toHaveBeenCalled();
      });

      it('should open emergency calling settings setup modal on clicking link with parameters', () => {
        ({ fixture, page, component } = createComponent(
          RefreshOverviewComponent,
          RefreshOverviewPage
        ));
        const openEmergencyCallSettingsSetupModal = jest.spyOn(modalService, 'open');
        component.openEmergencyCallSettingsSetupModal(true);
        expect(openEmergencyCallSettingsSetupModal).toHaveBeenCalledWith({
          content: EmergencyCallSettingsSetupModalComponent,
          data: {
            level: 'ORGANIZATION',
            orgId: authInfoService.getOrgId(),
          },
          backdrop: true,
          backdropClickExit: false,
          sizeType: 'full',
        });
      });

      it('should open enhanced emergency calling settings setup modal when parameter is false', () => {
        ({ fixture, page, component } = createComponent(
          RefreshOverviewComponent,
          RefreshOverviewPage
        ));
        const openEmergencyCallSettingsSetupModal = jest.spyOn(modalService, 'open');
        component.openEmergencyCallSettingsSetupModal(false);
        component.openEnhancedEmergencyCallingSetupModal();
        expect(openEmergencyCallSettingsSetupModal).toHaveBeenCalledWith({
          content: EnhancedEmergencyCallingSetupModalComponent,
          data: {},
          backdrop: true,
          backdropClickExit: false,
          sizeType: 'full',
        });
      });

      it('should not have EmergencyCallSettingsSetupBanner alert banner and the banner when locations are confirmed', () => {
        webexCallingE911NotificationService.notification$ = of({
          enable: true,
        });
        ({ fixture, page, component } = createComponent(
          RefreshOverviewComponent,
          RefreshOverviewPage
        ));
        fixture.detectChanges();
        expect(page.isEmergencyCallSettingsSetupBanner).toBe(null);
      });
    });
  });
});
