"""DC model: Liu et al. (2016), Eq. (16). Pure calculation; no plotting or I/O.
Discrete coordinate modes are explicit reproduction conventions, not paper claims.
"""
from dataclasses import dataclass, replace
import numpy as np

@dataclass(frozen=True)
class WarehouseConfig:
    tiers: int = 12
    bays: int = 24
    cell_width: float = 4.5
    cell_height: float = 4.5
    horizontal_speed: float = 2.0
    vertical_speed: float = 1.0
    coordinate_mode: str = 'tier1_origin'

    def __post_init__(self):
        for name in ('tiers', 'bays'):
            value = getattr(self, name)
            if isinstance(value, bool) or not isinstance(value, (int, np.integer)) or value < 1:
                raise ValueError(f'{name} must be a positive integer')
        for name in ('cell_width','cell_height','horizontal_speed','vertical_speed'):
            if not np.isfinite(getattr(self,name)) or getattr(self,name) <= 0:
                raise ValueError(f'{name} must be finite and positive')
        if self.coordinate_mode not in ('tier1_origin','cell_centers','far_edges'):
            raise ValueError('Unknown coordinate_mode')

    @property
    def length(self): return self.bays * self.cell_width
    @property
    def height(self): return self.tiers * self.cell_height
    @property
    def th(self): return self.length / self.horizontal_speed
    @property
    def b(self): return (self.height / self.vertical_speed) / self.th


def expected_normalized_dc(b, n):
    """Published Eq. (16), zero transfer times, dimensionless."""
    if not np.isfinite(b) or b <= 0:
        raise ValueError('b must be finite and positive')
    if isinstance(n,bool) or not isinstance(n,(int,np.integer)) or n < 1:
        raise ValueError('n must be a positive integer')
    if b <= 2:
        return 1.5 - 1/(6*n) + b + (n-1)*b*b/(24*n)
    return .5 + 5/(6*n) + (4*n-1)*b/(3*n) + (4*n-4)/(3*n*b) - (2*n-2)/(3*n*b*b)


def theoretical_expected_time(config):
    """Seconds. Continuous face L=m*w, H=n*h; no rounded shape factors."""
    return config.th * expected_normalized_dc(config.b, config.tiers)


def _check_count(n):
    if isinstance(n,bool) or not isinstance(n,(int,np.integer)) or n < 2:
        raise ValueError('n_samples must be an integer >= 2')


def generate_tasks(config, n_samples, seed=20261106):
    """Independent uniform storage/retrieval cells, sampled with replacement.
    No inventory state. Same cell allowed. Indices are zero-based.
    """
    _check_count(n_samples)
    rng = np.random.default_rng(seed)
    return {name: rng.integers(high, size=n_samples) for name,high in (
        ('storage_tier',config.tiers), ('storage_bay',config.bays),
        ('retrieval_tier',config.tiers), ('retrieval_bay',config.bays))}


def cell_travel_times(config, tier, bay):
    """Return single-leg horizontal/vertical times in seconds, not normalized."""
    tier, bay = np.asarray(tier), np.asarray(bay)
    if np.any(tier < 0) or np.any(tier >= config.tiers) or np.any(tier != np.floor(tier)):
        raise ValueError('Invalid tier index')
    if np.any(bay < 0) or np.any(bay >= config.bays) or np.any(bay != np.floor(bay)):
        raise ValueError('Invalid bay index')
    if config.coordinate_mode == 'cell_centers':
        x, y = (bay+.5)*config.cell_width, (tier+.5)*config.cell_height
    elif config.coordinate_mode == 'far_edges':
        x, y = (bay+1)*config.cell_width, (tier+1)*config.cell_height
    else:
        x, y = (bay+1)*config.cell_width, tier*config.cell_height
    return x/config.horizontal_speed, y/config.vertical_speed


def task_time(config, storage_tier, storage_bay, retrieval_tier, retrieval_bay):
    """Paper's delivery-completion clock, seconds; zero transfer time.
    Retrieval starts after storage ends; VP and retrieval HP then move in parallel.
    Does not wait for storage HP reset in the different-tier branch.
    """
    x1,y1 = cell_travel_times(config,storage_tier,storage_bay)
    x2,y2 = cell_travel_times(config,retrieval_tier,retrieval_bay)
    same = np.asarray(storage_tier) == np.asarray(retrieval_tier)
    storage = x1+y1
    retrieval = np.where(same, np.abs(x1-x2)+x2+y1,
                         np.maximum(np.abs(y1-y2),2*x2)+y2)
    return storage+retrieval


def gap_metrics(theory, samples):
    """95% normal-approximation CI for the *simulation population mean*."""
    a = np.asarray(samples,dtype=float)
    if a.ndim != 1 or len(a)<2 or not np.isfinite(a).all():
        raise ValueError('Need at least two finite one-dimensional samples')
    if not np.isfinite(theory): raise ValueError('Theory must be finite')
    mean=float(a.mean()); sd=float(a.std(ddof=1)); se=sd/np.sqrt(a.size)
    absolute=abs(mean-theory)
    return dict(n_samples=a.size,theory_s=float(theory),simulation_mean_s=mean,
        signed_gap_s=mean-theory,absolute_gap_s=absolute,
        relative_gap_pct=100*absolute/abs(theory) if theory != 0 else np.nan,
        paper_deviation_pct=100*(mean-theory)/mean if mean != 0 else np.nan,
        sample_sd_s=sd,standard_error_s=se,
        ci95_low_s=mean-1.959963984540054*se,ci95_high_s=mean+1.959963984540054*se)


def run_monte_carlo(config, n_samples=100_000, seed=20261106):
    tasks=generate_tasks(config,n_samples,seed)
    samples=np.asarray(task_time(config,**tasks))
    metrics=gap_metrics(theoretical_expected_time(config),samples)
    metrics['same_tier_fraction']=float(np.mean(tasks['storage_tier']==tasks['retrieval_tier']))
    return dict(config=config,tasks=tasks,samples=samples,metrics=metrics)


def exact_discrete_mean(config):
    """Independent finite enumeration for SMALL racks only; validation oracle.
    Does not call task_time or the theoretical formula.
    """
    if (config.tiers*config.bays)**2 > 1_000_000:
        raise ValueError('Exact enumeration limited to one million task pairs')
    values=[]
    for i in range(config.tiers):
        for j in range(config.bays):
            a,u=cell_travel_times(config,i,j)
            for k in range(config.tiers):
                for l in range(config.bays):
                    c,v=cell_travel_times(config,k,l)
                    if i==k:
                        # Explicit motion segments: store, move to retrieval, return HP, descend.
                        values.append(u+a+abs(a-c)+c+u)
                    else:
                        # Event clock: both resources must arrive before the final descent.
                        store_finished=u+a
                        vp_arrives=store_finished+abs(u-v)
                        hp_arrives=store_finished+c+c
                        values.append(max(vp_arrives,hp_arrives)+v)
    return float(np.mean(values))
