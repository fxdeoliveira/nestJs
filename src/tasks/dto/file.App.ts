import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthInfoService } from '@webex/atlas/auth/info';
import { WebexCallingE911NotificationService } from '@webex/atlas/call/data-access';
import { EmergencyCallSettingsSetupService } from '@webex/atlas/call/emergency/data-access';
import {
  EmergencyCallSettingsSetupModalComponent,
  EnhancedEmergencyCallingSetupModalComponent,
} from '@webex/atlas/call/emergency/feature';
import { EmergencyCallSettingsSetupLevel, ISetupStepLicencesStatus } from '@webex/atlas/call/types';
import { ConfigService as Config } from '@webex/atlas/config/data-access';
import { FeatureTogglesFacade } from '@webex/atlas/feature-toggles/data-access';
import { EnhancedEmergencyCallingSettingsFacade } from '@webex/atlas/org-settings/data-access';
import { ExperienceService } from '@webex/atlas/organization-health/data-access';
import { SMBViewModeState } from '@webex/atlas/smb/data-access';
import { SMBViewMode } from '@webex/atlas/smb/types';
import {
  UpgradeMeetingsFacade,
  UpgradeMeetingsService,
} from '@webex/atlas/upgrade-and-migration/data-access';
import { WalkThru } from '@webex/atlas/walk-me/main/feature';
import { features } from '@webex/common/feature-toggles/types';
import { ModalService } from '@webex/common/ui/momentum-ch';
import { EnvService } from '@webex/common/utils/env';
import _ from 'lodash';
import { BehaviorSubject, combineLatest, defer, Observable, of, Subject } from 'rxjs';
import { filter, map, switchMap, take } from 'rxjs/operators';

const FCC_URL_LINK =
  'https://www.fcc.gov/document/implementing-karis-law-and-section-506-ray-baums-act-0';
const EMERGENCY_CALL_URL_LINK = 'https://help.webex.com/en-US/article/av6oo3/';

@Component({
  selector: 'webex-refresh-overview',
  templateUrl: './refresh-overview.component.html',
  styleUrls: ['./refresh-overview.component.scss'],
})
export class RefreshOverviewComponent implements OnInit {
  constructor(
    @Inject('$state') private $state,
    @Inject('LinkedSiteModalService') private linkedSiteModalService: any,
    @Inject('SetupWizardService') private setupWizardService: any,
    private authinfo: AuthInfoService,
    private config: Config,
    private e911NotificationService: WebexCallingE911NotificationService,
    private enhancedEmergencyFacade: EnhancedEmergencyCallingSettingsFacade,
    private envService: EnvService,
    private experienceService: ExperienceService,
    private ft: FeatureTogglesFacade,
    private modal: ModalService,
    private route: ActivatedRoute,
    private router: Router,
    private smbViewModeState: SMBViewModeState,
    private upgrademeetingsFacade: UpgradeMeetingsFacade,
    private upgradeMeetingsService: UpgradeMeetingsService,
    private emergencyCallSettingsSetupService: EmergencyCallSettingsSetupService
  ) {}

  readonly tourId = WalkThru.ADMIN_ONBOARDING;
  public showTourLink$ = this.ft.supports$(features.atlasWalkMeOverviewTourLink);
  public showExperienceScoreCard$ = combineLatest([
    this.ft.supports$(features.atlasOrganizationHealthSpark139442),
    this.ft.supports$(features.atlasGettingStartedSpark89522),
    this.ft.supports$(features.atlasWebexExperienceSpark246291),
  ]).pipe(
    map(
      ([
        atlasOrganizationHealthSpark139442,
        atlasGettingStartedSpark89522,
        atlasWebexExperienceSpark246291,
      ]): boolean => {
        return (
          atlasOrganizationHealthSpark139442 &&
          !atlasGettingStartedSpark89522 &&
          !atlasWebexExperienceSpark246291
        );
      }
    )
  );

  public showWebexExperienceCard$ = this.experienceService.getExperienceLaunched$.pipe(
    map((getExperienceLaunched: boolean) => getExperienceLaunched && !this.envService.isFedRamp())
  );

  public showGettingStartedCard$ = combineLatest([
    this.showWebexExperienceCard$,
    this.ft.supports$(features.atlasGettingStartedSpark89522),
  ]).pipe(
    map(
      ([showWebexExperienceCard, gettingStartedFT]): boolean =>
        !showWebexExperienceCard && gettingStartedFT && !this.envService.isFedRamp()
    )
  );

  //Code added by @WebExSquared/atlas-webex-smb for SPARK-172208(Restricted View)
  SMBViewMode$ = this.smbViewModeState.getSMBViewMode().pipe(
    filter(smbViewMode => smbViewMode !== SMBViewMode.IS_LOADING),
    map(smbViewMode => {
      return {
        isSMBViewModeUnRestricted: smbViewMode === SMBViewMode.UNRESTRICTED,
        isSMBViewModeRestricted: smbViewMode === SMBViewMode.RESTRICTED,
      };
    }),
    take(1)
  );
  public showNewOffersCard$ = this.ft.supports$(features.atlasFreeMeetingsTierSpark281740);
  public showRestrictedViewBanner = true;
  public showUpgradeServicesCard$ = this.ft.supports$(features.wxcUpgradeAndMigration);
  public sparkCallEOS$ = this.ft.supports$(features.wxcSparkCallEOS);
  private upgradeMeetingsEnabled: boolean;
  public isProvisionAdmin: boolean;
  public hasSparkCallOnly = !this.authinfo.isBroadCloudActive() && this.authinfo.isSparkCall();
  public showSetupReminder = false;
  public needFirstTimeSetup: boolean;
  public needWebexMeetingSetup: boolean;
  public dedicatedInstanceSetup: boolean;
  public showSetupReminder$: Observable<boolean>;
  public supportsFtusw$: Observable<boolean>;
  public siteListDetails$ = this.upgrademeetingsFacade.allUpgrades$;
  public hideOverviewBanner: Subject<boolean>;
  public onboardingBanner$: Observable<{
    atlasOverviewBannerBefore0415: boolean;
    atlasOverviewBannerAfter0415: boolean;
    l10nLink: string;
    l10nMessage: string;
  }>;
  private hideRayBaumBanner: BehaviorSubject<boolean> = new BehaviorSubject(false);
  public rayBaumBanner$: Observable<{
    showE911RayBaumBanner: boolean;
  }>;
  public readonly fccRegulationsLink = FCC_URL_LINK;
  public readonly emergencyCallLink = EMERGENCY_CALL_URL_LINK;
  private hideEmergencyCallSettingSetupBanner: BehaviorSubject<boolean> = new BehaviorSubject(
    false
  );
  public emergencyCallSettingsSetup$: Observable<ISetupStepLicencesStatus>;

  public ngOnInit() {
    const state = this.route.snapshot.data.state;
    const showInvalidTrialModal = state?.showInvalidTrialModal;
    const trial = state?.trial;

    /*
     *redirect to invalid trial modal when a duplicate
     *service has been accepted by a customer -- multi partner trial
     * TODO(yeonskim) to cleanup this legacy $state logic.
     * https://sqbu-github.cisco.com/WebExSquared/wx2-admin-web-client/pull/25635#discussion_r1069804
     */
    if (showInvalidTrialModal && trial) {
      this.$state.go('invalid-trial-modal', {
        trial: trial.trialId,
        customerName: trial.customerName,
        customerOrgId: trial.customerOrgId,
        partnerOrgId: trial.partnerOrgId,
        partnerUuid: trial.partnerUuid,
      });
    }

    if (this.authinfo.isExternalAdmin() || this.authinfo.isCustomerAdmin()) {
      this.ft
        .supports$(features.atlasOverviewNewLinkedSiteModalSpark80899)
        .pipe(take(1))
        .subscribe(enabled => {
          if (enabled) {
            this.linkedSiteModalService.showNewLinkedSiteModal();
          }
        });
    }

    this.isProvisionAdmin = this.authinfo.isProvisionAdmin();
    this.showSetupReminder$ = combineLatest([
      !this.setupWizardService.serviceDataHasBeenInitialized
        ? (defer(() => this.setupWizardService.populatePendingSubscriptions() as Promise<[]>).pipe(
            map(pendingSubs => {
              return pendingSubs.length !== 0;
            })
          ) as Observable<boolean>)
        : of<boolean>(this.authinfo.getPendingSubscriptions() ?? false),
      of<boolean>(
        this.authinfo.isAdminSettingUpOrg() || this.setupWizardService.showPendingConsent()
      ),
    ]).pipe(
      switchMap(([hasPendingSubs, needFirstTimeSetup]) => {
        if (needFirstTimeSetup) {
          this.needFirstTimeSetup = needFirstTimeSetup;
          return of(needFirstTimeSetup);
        } else {
          if (hasPendingSubs) {
            if (
              this.setupWizardService.hasPendingCCWSubscriptions() ||
              this.setupWizardService.hasPendingMultiPartnerWebexTrial()
            ) {
              const pendingServiceOrderUUID = this.setupWizardService.getActingSubscriptionServiceOrderUUID();

              return defer(
                () =>
                  this.setupWizardService.getPendingOrderStatusDetails(
                    pendingServiceOrderUUID
                  ) as Promise<any>
              ).pipe(
                map(productProvStatus => {
                  if (
                    productProvStatus &&
                    _.some(productProvStatus, {
                      status: this.config.webexSiteStatus.PENDING_PARM,
                      productName: this.config.dedicatedInstanceProductName,
                    })
                  ) {
                    this.setupWizardService.setDedicatedInstanceSetup(true);
                    this.dedicatedInstanceSetup = true;
                    return this.dedicatedInstanceSetup;
                  } else {
                    if (this.setupWizardService.getModifyFeatureFlagValue()) {
                      this.setupWizardService.setProductProvStatus(productProvStatus);
                      this.needWebexMeetingSetup =
                        this.setupWizardService.getProvisioningState() ===
                        this.setupWizardService.provisionedState.needsWebex;
                    } else {
                      this.needWebexMeetingSetup = _.some(productProvStatus, {
                        status: this.config.webexSiteStatus.PENDING_PARM,
                        productName: this.config.webexProductName,
                      });
                    }
                    return this.needWebexMeetingSetup;
                  }
                })
              );
            } else {
              return of(false);
            }
          }
          return of(false);
        }
      })
    );
    this.ft.supports$(features.atlasUpgradeMeetingSitesSpark160007).subscribe(isSupported => {
      this.upgradeMeetingsEnabled = isSupported;
    });
    this.hideOverviewBanner = new BehaviorSubject(false);
    this.onboardingBanner$ = combineLatest([
      this.ft.supports$(features.atlasOverviewBannerBefore0415),
      this.ft.supports$(features.atlasOverviewBannerAfter0415),
      this.hideOverviewBanner.asObservable(),
    ]).pipe(
      map(([atlasOverviewBannerBefore0415, atlasOverviewBannerAfter0415, hideOverviewBanner]) => {
        const l10nLink = hideOverviewBanner
          ? ''
          : atlasOverviewBannerAfter0415
          ? 'refreshOverview.onboardingBanner.link.after'
          : atlasOverviewBannerBefore0415
          ? 'refreshOverview.onboardingBanner.link.before'
          : '';
        const l10nMessage = hideOverviewBanner
          ? ''
          : atlasOverviewBannerAfter0415
          ? 'refreshOverview.onboardingBanner.message.after'
          : atlasOverviewBannerBefore0415
          ? 'refreshOverview.onboardingBanner.message.before'
          : '';

        return {
          atlasOverviewBannerBefore0415,
          atlasOverviewBannerAfter0415,
          l10nLink,
          l10nMessage,
        };
      })
    );

    this.enhancedEmergencyFacade.dispatchLoadEnhancedEmergencyCallingSetupSettings();

    this.rayBaumBanner$ = combineLatest([
      this.e911NotificationService.notification$,
      this.hideRayBaumBanner.asObservable(),
      this.ft.supports$(features.wxcEmergencyCallSettingsSetup6316),
    ]).pipe(
      map(([{ enable }, hideRayBaumBanner, supportsWxcEmergencyCallSettingsSetup6316]) => ({
        showE911RayBaumBanner:
          enable && !hideRayBaumBanner && !supportsWxcEmergencyCallSettingsSetup6316,
      }))
    );
    this.emergencyCallSettingsSetup$ = this.emergencyCallSettingsSetupService.emergencyCallSettingsSetup$;
  }

  public closeRestrictedViewBanner(): void {
    this.showRestrictedViewBanner = false;
  }
  public closeRayBaumBanner(): void {
    this.hideRayBaumBanner.next(true);
  }

  public closeEmergencyCallSettingsSetupBanner(): void {
    this.hideEmergencyCallSettingSetupBanner.next(true);
  }

  routeToLink(
    event: Event,
    atlasOverviewBannerBefore0415: boolean,
    atlasOverviewBannerAfter0415: boolean
  ): void {
    event.preventDefault();
    if (atlasOverviewBannerAfter0415) {
      this.router.navigate(['/reports', 'scheduleReports'], { queryParams: { reportId: '' } });
    } else if (atlasOverviewBannerBefore0415) {
      this.router.navigate(['/account', 'onboarding']);
    }
  }

  canShowUpgradeSplash(sites): boolean {
    return (
      this.authinfo.hasRole(this.config.roles.full_admin) &&
      this.upgradeMeetingsEnabled &&
      this.upgradeMeetingsService.isGetStartedState(sites) &&
      !this.upgradeMeetingsService.getSplashPageShownStatus()
    );
  }

  closeUpgradeSplash() {
    this.upgradeMeetingsService.setSplashPageShownStatus(true);
  }

  openEnhancedEmergencyCallingSetupModal() {
    this.modal.open({
      content: EnhancedEmergencyCallingSetupModalComponent,
      data: {},
      backdrop: true,
      backdropClickExit: false,
      sizeType: 'full',
    });
  }

  public openEmergencyCallSettingsSetupModal(emergencyCallSettingsSetupStep: boolean) {
    if (emergencyCallSettingsSetupStep) {
      this.modal.open({
        content: EmergencyCallSettingsSetupModalComponent,
        data: {
          level: EmergencyCallSettingsSetupLevel.ORGANIZATION,
          orgId: this.authinfo.getOrgId(),
        },
        backdrop: true,
        backdropClickExit: false,
        sizeType: 'full',
      });
    } else {
      this.openEnhancedEmergencyCallingSetupModal();
    }
  }
}
