def partial(func, *args, **kwargs):
    def wrapper(*more_args, **more_kwargs):
        kw = kwargs.copy()
        kw.update(more_kwargs)
        return func(*(args + more_args), **kw)

    return wrapper
